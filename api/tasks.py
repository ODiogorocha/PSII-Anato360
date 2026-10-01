import base64
import binascii
import io
import logging
import os

import requests
from celery import shared_task
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from PIL import Image

from .models import ImageAnnotation, UploadedImage, UserNotification

logger = logging.getLogger(__name__)


def _finish_with_error(image_id, message):
    with transaction.atomic():
        image = UploadedImage.objects.select_for_update().filter(pk=image_id).first()
        if image is None:
            return
        image.status = UploadedImage.Status.FAILED
        image.error_message = str(message)[:2000]
        image.processed_at = timezone.now()
        image.save(update_fields=['status', 'error_message', 'processed_at'])
        UserNotification.objects.create(
            user=image.owner,
            image=image,
            message=f'O processamento da imagem {image.pk} falhou: {image.error_message}'[:500],
        )


@shared_task(bind=True, max_retries=3, default_retry_delay=15, name='api.process_uploaded_image')
def process_uploaded_image(self, image_id):
    try:
        image = UploadedImage.objects.select_related('owner').get(pk=image_id)
    except UploadedImage.DoesNotExist:
        return

    if image.status == UploadedImage.Status.READY:
        return {'image_id': image.pk, 'status': image.status}

    image.status = UploadedImage.Status.PROCESSING
    image.error_message = ''
    image.save(update_fields=['status', 'error_message'])

    saved_processed_file = None
    try:
        with image.original_file.open('rb') as source:
            response = requests.post(
                f"{os.getenv('IMAGE_PROCESSOR_URL', 'http://image-processor:8001')}/process",
                files={'file': (os.path.basename(image.original_file.name), source, 'application/octet-stream')},
                data={'image_id': str(image.pk), 'use_ollama': str(image.use_ollama).lower()},
                timeout=(20, 1800),
            )
        response.raise_for_status()
        result = response.json()
        encoded_image = result.get('processed_image_base64')
        if result.get('isProcessed') is not True or not encoded_image:
            raise ValueError(result.get('error') or 'O serviço não retornou uma imagem processada.')
        try:
            processed_bytes = base64.b64decode(encoded_image, validate=True)
        except (binascii.Error, ValueError) as error:
            raise ValueError('O serviço retornou os dados da imagem em formato inválido.') from error
        with Image.open(io.BytesIO(processed_bytes)) as processed:
            width, height = processed.size
            if processed.format != 'PNG':
                raise ValueError('O serviço de processamento deve retornar uma imagem PNG.')
            processed.verify()

        with transaction.atomic():
            image = UploadedImage.objects.select_for_update().select_related('owner').get(pk=image_id)
            previous_file = image.processed_file.name
            image.processed_file.save(f'{image.pk}-processada.png', ContentFile(processed_bytes), save=False)
            saved_processed_file = image.processed_file.name
            image.processing_metadata = {
                **(result.get('metadata') or {}),
                'width': width,
                'height': height,
                'processor_image_id': result.get('id'),
            }
            image.status = UploadedImage.Status.READY
            image.error_message = ''
            image.processed_at = timezone.now()
            image.save(update_fields=[
                'processed_file', 'processing_metadata', 'status', 'error_message', 'processed_at',
            ])
            image.annotations.all().delete()
            for label in result.get('rotules', []):
                label_text = str(label.get('text', '')).strip()[:500]
                if not label_text:
                    continue
                position = label.get('normalizedPosition') or {}
                ImageAnnotation.objects.create(
                    image=image,
                    text=label_text,
                    text_es=str(label.get('text_es', '')).strip()[:500],
                    x=float(label.get('x', 0)),
                    y=float(label.get('y', 0)),
                    confidence=label.get('confidence'),
                    polygon=label.get('polygon') or [],
                    bounding_box=label.get('boundingBox'),
                    normalized_x=position.get('x', float(label.get('x', 0)) / width),
                    normalized_y=position.get('y', float(label.get('y', 0)) / height),
                )
            UserNotification.objects.create(
                user=image.owner,
                image=image,
                message=f'A imagem {image.pk} terminou de processar. Revise os rótulos para disponibilizar o quiz.',
            )
            if previous_file and previous_file != image.processed_file.name:
                transaction.on_commit(lambda: image.processed_file.storage.delete(previous_file))
        return {'image_id': image.pk, 'status': image.status}
    except UploadedImage.DoesNotExist:
        # A user can delete an upload while the independent processor is working.
        return
    except requests.HTTPError as error:
        if error.response is not None and error.response.status_code < 500:
            try:
                detail = error.response.json().get('detail', error.response.text)
            except ValueError:
                detail = error.response.text
            _finish_with_error(image_id, detail)
            return {'image_id': image_id, 'status': UploadedImage.Status.FAILED}
        if self.request.retries < self.max_retries:
            raise self.retry(exc=error)
        _finish_with_error(image_id, f'Serviço de imagens indisponível: {error}')
        return {'image_id': image_id, 'status': UploadedImage.Status.FAILED}
    except requests.RequestException as error:
        if self.request.retries < self.max_retries:
            raise self.retry(exc=error)
        _finish_with_error(image_id, f'Serviço de imagens indisponível: {error}')
        return {'image_id': image_id, 'status': UploadedImage.Status.FAILED}
    except Exception as error:
        logger.exception('Image %s processing failed', image_id)
        if saved_processed_file:
            image.processed_file.storage.delete(saved_processed_file)
        _finish_with_error(image_id, error)
        return {'image_id': image_id, 'status': UploadedImage.Status.FAILED}
