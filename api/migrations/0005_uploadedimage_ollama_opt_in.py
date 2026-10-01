from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('api', '0004_imageannotation_confirmed_imageannotation_text_es_and_more')]

    operations = [
        migrations.AlterField(
            model_name='uploadedimage', name='use_ollama',
            field=models.BooleanField(default=False),
        ),
    ]
