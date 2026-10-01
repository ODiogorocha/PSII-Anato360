"""Isolated API tests; production and Compose always use MySQL settings."""
from .settings import *  # noqa: F403

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
PASSWORD_HASHERS = ['django.contrib.auth.hashers.PBKDF2PasswordHasher']
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
