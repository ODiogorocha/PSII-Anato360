from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0005_uploadedimage_ollama_opt_in')]

    operations = [
        migrations.AddField(
            model_name='uploadedimage', name='processing_mode',
            field=models.CharField(
                choices=[('automatic', 'Automático'), ('manual', 'Manual')],
                default='automatic', max_length=16,
            ),
        ),
    ]
