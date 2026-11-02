# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS frontend-builder

WORKDIR /build/frontend

COPY frontend_anato360/package.json frontend_anato360/pnpm-lock.yaml ./
RUN corepack enable \
    && corepack pnpm install --frozen-lockfile

COPY frontend_anato360/ ./

RUN corepack pnpm build


FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY manage.py ./
COPY api/ ./api/
COPY backend/ ./backend/
COPY IA_module/ ./IA_module/

COPY --from=frontend-builder /build/frontend/dist/ /usr/share/nginx/html/
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

RUN sed -i 's/\r$//' /app/docker/entrypoint.sh \
    && chmod +x /app/docker/entrypoint.sh \
    && mkdir -p /app/data /app/media /app/staticfiles

EXPOSE 80

ENTRYPOINT ["/app/docker/entrypoint.sh"]
