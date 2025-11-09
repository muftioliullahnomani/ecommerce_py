#!/usr/bin/env sh
set -e

python manage.py migrate --noinput
python manage.py create_initial_superuser || true
python manage.py collectstatic --noinput

# Gunicorn bind to 0.0.0.0:$PORT for Railway
exec gunicorn backend_django.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3
