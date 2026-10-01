import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_pecaanatomica_arquivo_3d_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UploadedImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('original_file', models.ImageField(upload_to='user_uploads/originals/')),
                ('processed_file', models.ImageField(blank=True, upload_to='user_uploads/processed/')),
                ('allow_sharing', models.BooleanField(default=False)),
                ('status', models.CharField(choices=[('queued', 'Na fila'), ('processing', 'Em processamento'), ('ready', 'Pronta'), ('failed', 'Falha')], default='queued', max_length=16)),
                ('processing_metadata', models.JSONField(blank=True, default=dict)),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='uploaded_images', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('institution', models.CharField(max_length=180)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='ImageAnnotation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=500)),
                ('x', models.FloatField(help_text='Coordenada X do centro do texto na imagem original, em pixels.')),
                ('y', models.FloatField(help_text='Coordenada Y do centro do texto na imagem original, em pixels.')),
                ('confidence', models.FloatField(blank=True, null=True)),
                ('polygon', models.JSONField(blank=True, default=list)),
                ('bounding_box', models.JSONField(blank=True, null=True)),
                ('normalized_x', models.FloatField(blank=True, null=True)),
                ('normalized_y', models.FloatField(blank=True, null=True)),
                ('image', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='annotations', to='api.uploadedimage')),
            ],
            options={'ordering': ['id']},
        ),
        migrations.CreateModel(
            name='UserNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.CharField(max_length=500)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('image', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='api.uploadedimage')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
