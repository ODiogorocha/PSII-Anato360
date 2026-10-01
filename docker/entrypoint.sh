#!/bin/sh
set -eu

if [ "${1:-}" = "celery" ]; then
    exec "$@"
fi

mkdir -p /app/media /app/staticfiles

python manage.py migrate --noinput
python manage.py bootstrap_admin
python manage.py collectstatic --noinput

exec "$@"
