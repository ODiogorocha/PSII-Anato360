import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Cria o administrador inicial se ele ainda não existir.'

    def handle(self, *args, **options):
        username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin').strip()
        email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@anato360.local').strip().lower()
        password = os.getenv('DJANGO_SUPERUSER_PASSWORD', '')
        if not password:
            raise CommandError('Defina DJANGO_SUPERUSER_PASSWORD para criar o administrador inicial.')

        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_staff': True, 'is_superuser': True, 'is_active': True},
        )
        if created:
            user.set_password(password)
            user.save(update_fields=['password'])
            self.stdout.write(self.style.SUCCESS(f'Administrador inicial "{username}" criado.'))
        elif user.is_staff and user.is_superuser:
            self.stdout.write(f'Administrador "{username}" já existe; senha atual preservada.')
        else:
            raise CommandError(f'O usuário "{username}" existe, mas não é um superusuário.')
