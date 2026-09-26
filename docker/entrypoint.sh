#!/bin/sh
set -eu

database_path="${DATABASE_PATH:-/app/db.sqlite3}"
mkdir -p "$(dirname "$database_path")" /app/media /app/staticfiles

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
