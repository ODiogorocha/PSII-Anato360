FROM node:24-alpine AS builder

WORKDIR /app
COPY frontend_anato360_new/package.json frontend_anato360_new/package-lock.json ./
RUN npm ci
COPY frontend_anato360_new/ ./
ARG VITE_API_BASE_URL=/api/
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist/ /usr/share/nginx/html/
COPY docker/frontend-nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
