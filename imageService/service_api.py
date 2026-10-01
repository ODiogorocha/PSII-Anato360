"""API interna que aplica o pipeline de scripts e o aprimoramento opcional."""

import base64
import io
import os
import tempfile
import threading
from pathlib import Path

import cv2
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from PIL import Image as PillowImage, UnidentifiedImageError

from IA_module import OllamaClient, OllamaConfig
from imageService.ImageService import ImageService
from imageService.models.image import Image


def env_bool(name: str, default: str) -> bool:
    return os.getenv(name, default).strip().lower() in {'1', 'true', 'yes'}


app = FastAPI(title='Anato360 Image Processor', version='2.0.0')
DEFAULT_USE_OLLAMA = env_bool('IMAGE_USE_OLLAMA', 'false')
VISION_MODEL = os.getenv('OLLAMA_VISION_MODEL', 'llama3.2-vision:11b')
ollama_client = OllamaClient(OllamaConfig())
processor = ImageService(
    verbose=1,
    ollamaClient=ollama_client if DEFAULT_USE_OLLAMA else None,
    ollama_model=VISION_MODEL,
    validate_anatomy=env_bool('IMAGE_VALIDATE_ANATOMY', 'true'),
    ocr_gpu=env_bool('IMAGE_OCR_GPU', 'false'),
)
processor_lock = threading.Lock()
MAX_IMAGE_BYTES = int(os.getenv('IMAGE_MAX_BYTES', str(20 * 1024 * 1024)))
MAX_IMAGE_PIXELS = int(os.getenv('IMAGE_MAX_PIXELS', '16000000'))
LOCK_TIMEOUT = float(os.getenv('IMAGE_LOCK_TIMEOUT', '5'))
ALLOWED_SUFFIXES = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'}


@app.get('/health')
def health():
    # Liveness: modelos OCR/CLIP são carregados no primeiro processamento.
    return {'status': 'ok', 'ollama_enabled': DEFAULT_USE_OLLAMA, 'vision_model': VISION_MODEL}


@app.post('/process')
def process_image(
    file: UploadFile = File(...),
    image_id: str = Form(...),
    use_ollama: bool | None = Form(None),
):
    suffix = Path(file.filename or '').suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=415, detail='Formato de imagem não aceito.')
    if not image_id.strip() or len(image_id) > 128:
        raise HTTPException(status_code=422, detail='Informe um identificador de imagem válido, com até 128 caracteres.')
    # Apenas um pipeline/modelo reside em memória; o worker faz retry se ocupado.
    if not processor_lock.acquire(timeout=LOCK_TIMEOUT):
        raise HTTPException(status_code=503, detail='Processador ocupado. Tente novamente.', headers={'Retry-After': '5'})
    source_path = None
    previous_client = processor.ollamaClient
    try:
        content = file.file.read(MAX_IMAGE_BYTES + 1)
        if not content:
            raise HTTPException(status_code=422, detail='A imagem está vazia.')
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail=f'A imagem deve ter até {MAX_IMAGE_BYTES // (1024 * 1024)} MB.')
        try:
            with PillowImage.open(io.BytesIO(content)) as header:
                width, height = header.size
                if width * height > MAX_IMAGE_PIXELS:
                    raise HTTPException(status_code=413, detail=f'A imagem deve ter até {MAX_IMAGE_PIXELS} pixels.')
                if header.format not in {'JPEG', 'PNG', 'WEBP', 'BMP', 'TIFF'}:
                    raise HTTPException(status_code=415, detail='Formato interno de imagem não aceito.')
                header.verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as error:
            raise HTTPException(status_code=422, detail='O arquivo não contém uma imagem válida.') from error
        except PillowImage.DecompressionBombError as error:
            raise HTTPException(status_code=413, detail='As dimensões da imagem excedem o limite.') from error

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as source:
            source.write(content)
            source_path = Path(source.name)
        del content
        enabled = DEFAULT_USE_OLLAMA if use_ollama is None else use_ollama
        processor.ollamaClient = ollama_client if enabled else None
        image = Image(id=image_id, path=source_path)
        if not processor.addImage(image):
            code = 422 if image.is_valid is False else 503
            raise HTTPException(status_code=code, detail=image.error or 'Não foi possível validar a imagem.')
        result = processor.processImage(imageId=image_id)
        if result is None or not result.is_processed or result.data is None:
            raise HTTPException(status_code=503, detail=(result.error if result else None) or 'Não foi possível processar a imagem.')

        success, encoded = cv2.imencode('.png', result.data)
        if not success:
            raise HTTPException(status_code=500, detail='Não foi possível codificar a imagem processada.')
        payload = result.to_dict()
        payload['path'] = None
        payload['metadata']['ollamaRequested'] = enabled
        payload['processed_image_base64'] = base64.b64encode(encoded).decode('ascii')
        return payload
    finally:
        # O cleanup também pertence à seção crítica: nunca apaga outra requisição.
        processor.ollamaClient = previous_client
        processor.unprocessedImages.clear()
        processor.processedImages.clear()
        try:
            if source_path:
                source_path.unlink(missing_ok=True)
        finally:
            processor_lock.release()
