FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y git ca-certificates libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY imageService/service-requirements.txt imageService/requirements.txt ./imageService/
# CPU por padrão: evita instalar vários GB de bibliotecas CUDA em servidores sem GPU.
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r imageService/service-requirements.txt

COPY imageService/__init__.py imageService/ImageService.py imageService/service_api.py imageService/verbose.py ./imageService/
COPY imageService/models/ ./imageService/models/
COPY IA_module/ ./IA_module/

EXPOSE 8001
CMD ["uvicorn", "imageService.service_api:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1", "--limit-concurrency", "8"]
