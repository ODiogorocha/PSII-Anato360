from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

from imageService import Image, ImageService, Rotule


class FakeReader:
    def __init__(self, results):
        self.results = results
        self.calls = 0

    def readtext(self, _pixels, **_kwargs):
        self.calls += 1
        return self.results


class ImageServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def make_image(self, name: str, value: int = 210) -> Path:
        pixels = np.full((80, 120, 3), value, dtype=np.uint8)
        cv2.rectangle(pixels, (20, 25), (65, 45), (20, 20, 20), thickness=-1)
        path = self.directory / name
        self.assertTrue(cv2.imwrite(str(path), pixels))
        return path

    def make_service(self, reader=None, **kwargs) -> ImageService:
        return ImageService(
            anatomy_validator=lambda _pixels: 0.95,
            ocr_reader=reader or FakeReader([]),
            text_margin=1,
            **kwargs,
        )

    def test_image_model_has_independent_rotules_and_can_save(self):
        first = Image("first", self.make_image("first.png"))
        second = Image("second", self.make_image("second.png"))
        first.rotules.append(Rotule("rim", 10, 20))
        self.assertEqual(second.rotules, [])

        first.data = np.zeros((10, 12, 3), dtype=np.uint8)
        first.is_processed = True
        second.data = np.ones((10, 12, 3), dtype=np.uint8)
        self.assertFalse(first == second)
        output = first.save(self.directory / "out" / "saved")
        self.assertTrue(output.is_file())
        self.assertEqual(output.suffix, ".png")
        self.assertEqual(cv2.imread(str(output)).shape, (10, 12, 3))

    def test_complete_pipeline_extracts_masks_and_reconstructs(self):
        reader = FakeReader(
            [
                (
                    [[20, 25], [65, 25], [65, 45], [20, 45]],
                    "  Rim\n esquerdo ",
                    0.91,
                ),
                ([[1, 1], [5, 1], [5, 5], [1, 5]], "ruído", 0.05),
            ]
        )
        service = self.make_service(reader, ocr_confidence=0.30)
        image = Image("anatomy", self.make_image("anatomy.png"))

        self.assertTrue(service.addImage(image))
        result = service.processImage()

        self.assertIs(result, image)
        self.assertTrue(result.is_valid)
        self.assertTrue(result.is_processed)
        self.assertIsNone(result.error)
        self.assertEqual(reader.calls, 1)
        self.assertEqual(len(result.rotules), 1)
        self.assertEqual(result.rotules[0].text, "Rim esquerdo")
        self.assertGreater(np.count_nonzero(result.text_mask), 0)
        self.assertEqual(result.data.shape, result.original_data.shape)
        self.assertFalse(np.array_equal(result.data, result.original_data))
        self.assertEqual(result.metadata["reconstruction"]["method"], "telea")
        self.assertEqual(service.getResult(), [image])

        serialized = result.to_dict()
        self.assertEqual(serialized["rotules"][0]["boundingBox"]["x1"], 20)
        self.assertAlmostEqual(serialized["rotules"][0]["normalizedPosition"]["x"], 42.5 / 119)

    def test_queue_filters_and_result_limits(self):
        service = self.make_service()
        images = [Image(name, self.make_image(f"{name}.png")) for name in ("a", "b", "c")]
        self.assertEqual(service.addImage(images), [True, True, True])

        self.assertIs(service.processImage(imageId="b"), images[1])
        self.assertEqual(service.processImage(imageIds=[]), [])
        self.assertEqual(service.getResult(imageIds=[]), [])
        self.assertIs(service.processImage(), images[0])
        self.assertEqual(service.processBatch(n_images=1), [images[2]])
        self.assertEqual(service.getResult(n_images=0), [])
        self.assertEqual(service.getResult(n_images=2), [images[0], images[2]])
        self.assertEqual(service.getResult(imageId="missing"), [])

    def test_rejects_non_anatomical_duplicate_and_invalid_file(self):
        path = self.make_image("ordinary.png")
        rejected = Image("ordinary", path)
        service = ImageService(
            anatomy_validator=lambda _pixels: 0.1,
            ocr_reader=FakeReader([]),
        )
        self.assertFalse(service.addImage(rejected))
        self.assertFalse(rejected.is_valid)
        self.assertIn("não foi classificada", rejected.error)

        accepted_service = self.make_service()
        accepted = Image("same-id", path)
        duplicate = Image("same-id", path)
        self.assertTrue(accepted_service.addImage(accepted))
        self.assertFalse(accepted_service.addImage(duplicate))
        self.assertIn("Já existe", duplicate.error)
        self.assertFalse(accepted_service.addImage(accepted))
        self.assertTrue(accepted.is_valid)
        self.assertIsNone(accepted.error)

        invalid = Image("invalid", self.directory / "missing.png")
        self.assertFalse(accepted_service.addImage(invalid))
        self.assertIn("não existe", invalid.error)

        accepted_service.processImage()
        other_service = self.make_service()
        self.assertFalse(other_service.addImage(accepted))
        self.assertTrue(accepted.is_valid)
        self.assertTrue(accepted.is_processed)

    def test_result_filters_are_validated_even_when_result_queue_is_empty(self):
        service = self.make_service()
        with self.assertRaises(ValueError):
            service.getResult(n_images=-2)
        with self.assertRaises(TypeError):
            service.getResult(imageIds="abc")

    def test_validator_failure_is_not_reported_as_non_anatomical_content(self):
        def unavailable(_pixels):
            raise RuntimeError("modelo fora do ar")

        service = ImageService(anatomy_validator=unavailable, ocr_reader=FakeReader([]))
        image = Image("validation-error", self.make_image("validation-error.png"))

        self.assertFalse(service.addImage(image))
        self.assertIsNone(image.is_valid)
        self.assertEqual(image.metadata["status"], "validation_error")
        self.assertIn("modelo fora do ar", image.error)

    def test_normalizes_grayscale_bgra_and_16_bit_inputs(self):
        inputs = {
            "gray.png": np.full((24, 30), 127, dtype=np.uint8),
            "bgra.png": np.full((24, 30, 4), 127, dtype=np.uint8),
            "depth16.png": np.full((24, 30, 3), 32768, dtype=np.uint16),
        }
        service = self.make_service()
        images = []
        for index, (name, pixels) in enumerate(inputs.items()):
            path = self.directory / name
            self.assertTrue(cv2.imwrite(str(path), pixels))
            image = Image(f"format-{index}", path)
            self.assertTrue(service.addImage(image))
            images.append(image)

        results = service.processBatch()
        self.assertEqual(len(results), 3)
        for result in results:
            self.assertEqual(result.data.dtype, np.uint8)
            self.assertEqual(result.data.shape, (24, 30, 3))
            self.assertTrue(result.is_processed)

    def test_custom_enhancer_is_applied_only_after_text_removal(self):
        calls = []

        def enhancer(pixels, prompt):
            calls.append(prompt)
            return np.clip(pixels.astype(np.int16) + 10, 0, 255).astype(np.uint8)

        reader = FakeReader([([[20, 25], [65, 25], [65, 45], [20, 45]], "fígado", 0.9)])
        service = self.make_service(reader, image_enhancer=enhancer)
        image = Image("enhanced", self.make_image("enhanced.png"))

        service.addImage(image)
        result = service.processImage()

        self.assertEqual(len(calls), 1)
        self.assertEqual(result.metadata["enhancement"]["engine"], "custom-adapter")
        self.assertTrue(result.is_processed)

    def test_enhancement_clips_negative_brightness_without_absolute_value(self):
        black = np.zeros((3, 3, 3), dtype=np.uint8)
        adjusted = ImageService._applyEnhancementParameters(
            black,
            {"brightness": -20, "contrast": 1, "saturation": 1, "sharpness": 0, "denoise": 0},
        )
        self.assertTrue(np.all(adjusted == 0))

        normalized_float = np.full((3, 3, 3), 128 / 255, dtype=np.float32)
        decoded = ImageService._decodeEnhancedImage(normalized_float)
        self.assertTrue(np.all(decoded == 128))

    def test_ollama_parameters_are_applied_with_opencv(self):
        class FakeOllama:
            def __init__(self):
                self.request = None

            def generate(self, **kwargs):
                self.request = kwargs
                return {
                    "response": (
                        '{"contrast": 1.1, "brightness": 5, "saturation": 1, '
                        '"sharpness": 0, "denoise": 0}'
                    )
                }

        client = FakeOllama()
        reader = FakeReader([([[20, 25], [65, 25], [65, 45], [20, 45]], "coração", 0.9)])
        service = self.make_service(reader, ollamaClient=client, ollama_model="vision-model")
        image = Image("ollama", self.make_image("ollama.png"))

        service.addImage(image)
        result = service.processImage()

        self.assertTrue(result.is_processed)
        self.assertEqual(client.request["model"], "vision-model")
        self.assertIsInstance(client.request["images"][0], bytes)
        self.assertEqual(result.metadata["enhancement"]["engine"], "ollama+opencv")

    def test_processing_failure_remains_available_as_result(self):
        class BrokenReader:
            def readtext(self, *_args, **_kwargs):
                raise RuntimeError("OCR indisponível")

        service = self.make_service(BrokenReader())
        image = Image("failure", self.make_image("failure.png"))
        service.addImage(image)

        result = service.processImage()

        self.assertFalse(result.is_processed)
        self.assertIn("OCR indisponível", result.error)
        self.assertEqual(service.getResult(), [result])

        service._ocrReader = FakeReader([])
        self.assertTrue(service.addImage(result))
        retried = service.processImage()
        self.assertIs(retried, result)
        self.assertTrue(retried.is_processed)
        self.assertIsNone(retried.error)


if __name__ == "__main__":
    unittest.main()
