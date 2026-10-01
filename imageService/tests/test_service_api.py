import io
import unittest
from unittest.mock import Mock, patch

import cv2
import numpy as np
from fastapi.testclient import TestClient

from imageService import ImageService
from imageService import service_api


class ServiceApiTest(unittest.TestCase):
    def setUp(self):
        reader = Mock()
        reader.readtext.return_value = [([[10, 10], [40, 10], [40, 30], [10, 30]], "rim", 0.9)]
        self.processor = ImageService(anatomy_validator=lambda pixels: True, ocr_reader=reader, ollama_model="vision-model")
        self.processor_patch = patch.object(service_api, "processor", self.processor)
        self.processor_patch.start()
        self.addCleanup(self.processor_patch.stop)
        self.client = TestClient(service_api.app)
        pixels = np.full((60, 80, 3), 200, dtype=np.uint8)
        cv2.rectangle(pixels, (10, 10), (40, 30), (0, 0, 0), -1)
        self.content = cv2.imencode(".png", pixels)[1].tobytes()

    def upload(self, use_ollama="false", content=None):
        return self.client.post(
            "/process",
            data={"image_id": "same-id", "use_ollama": use_ollama},
            files={"file": ("anatomia.png", io.BytesIO(self.content if content is None else content), "image/png")},
        )

    def test_script_only_result_contains_labels_and_cleans_queues(self):
        with patch.object(service_api.ollama_client, "generate") as generate:
            for _ in range(2):
                response = self.upload()
                self.assertEqual(response.status_code, 200, response.text)
                payload = response.json()
                self.assertTrue(payload["isProcessed"])
                self.assertEqual(payload["width"], 80)
                self.assertEqual(payload["rotules"][0]["text"], "rim")
                self.assertEqual(payload["metadata"]["enhancement"]["status"], "disabled")
                self.assertTrue(payload["processed_image_base64"])
                self.assertEqual(self.processor.processedImages, [])
                self.assertEqual(self.processor.unprocessedImages, [])
            generate.assert_not_called()

    def test_reconstruction_then_shared_ollama_enhancement(self):
        with patch.object(service_api.ollama_client, "generate", return_value={"response": '{"brightness": 5}'}) as generate:
            response = self.upload("true")
        self.assertEqual(response.status_code, 200, response.text)
        metadata = response.json()["metadata"]
        self.assertEqual(metadata["reconstruction"]["method"], "telea")
        self.assertEqual(metadata["enhancement"]["status"], "applied")
        self.assertEqual(metadata["enhancement"]["engine"], "ollama+opencv")
        self.assertTrue(metadata["ollamaRequested"])
        generate.assert_called_once()

    def test_ollama_failure_keeps_reconstructed_image_and_explains_fallback(self):
        with patch.object(service_api.ollama_client, "generate", side_effect=RuntimeError("modelo indisponível")):
            response = self.upload("true")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["isProcessed"])
        self.assertEqual(payload["metadata"]["enhancement"]["status"], "skipped")
        self.assertIn("modelo indisponível", payload["metadata"]["enhancement"]["error"])

    def test_invalid_and_oversized_inputs_do_not_leak_lock(self):
        self.assertEqual(self.upload(content=b"not-an-image").status_code, 422)
        with patch.object(service_api, "MAX_IMAGE_PIXELS", 10):
            self.assertEqual(self.upload().status_code, 413)
        with patch.object(service_api, "MAX_IMAGE_BYTES", 10):
            self.assertEqual(self.upload().status_code, 413)
        self.assertEqual(self.upload().status_code, 200)
        self.assertFalse(service_api.processor_lock.locked())

    def test_busy_processor_is_retryable(self):
        service_api.processor_lock.acquire()
        try:
            with patch.object(service_api, "LOCK_TIMEOUT", 0):
                response = self.upload()
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.headers["Retry-After"], "5")
        finally:
            service_api.processor_lock.release()


if __name__ == "__main__":
    unittest.main()
