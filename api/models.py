from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    institution = models.CharField(max_length=180)

    def __str__(self):
        return self.institution


class UploadedImage(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Na fila'
        PROCESSING = 'processing', 'Em processamento'
        READY = 'ready', 'Pronta'
        FAILED = 'failed', 'Falha'

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='uploaded_images')
    title = models.CharField(max_length=180, blank=True)
    title_es = models.CharField(max_length=180, blank=True)
    description = models.TextField(blank=True)
    description_es = models.TextField(blank=True)
    category = models.CharField(max_length=24, default='skeletal', choices=[
        ('skeletal', 'Esquelético'), ('muscular', 'Muscular'),
        ('digestive', 'Digestório'), ('respiratory', 'Respiratório'),
        ('circulatory', 'Circulatório'),
    ])
    use_ollama = models.BooleanField(default=False)
    original_file = models.ImageField(upload_to='user_uploads/originals/')
    processed_file = models.ImageField(upload_to='user_uploads/processed/', blank=True)
    allow_sharing = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.QUEUED)
    processing_metadata = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Imagem {self.pk} de {self.owner}'


class ImageAnnotation(models.Model):
    image = models.ForeignKey(UploadedImage, on_delete=models.CASCADE, related_name='annotations')
    text = models.CharField(max_length=500)
    text_es = models.CharField(max_length=500, blank=True)
    confirmed = models.BooleanField(default=False)
    x = models.FloatField(help_text='Coordenada X do centro do texto na imagem original, em pixels.')
    y = models.FloatField(help_text='Coordenada Y do centro do texto na imagem original, em pixels.')
    confidence = models.FloatField(null=True, blank=True)
    polygon = models.JSONField(default=list, blank=True)
    bounding_box = models.JSONField(null=True, blank=True)
    normalized_x = models.FloatField(null=True, blank=True)
    normalized_y = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.text


class UserNotification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    image = models.ForeignKey(UploadedImage, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    message = models.CharField(max_length=500)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class ChatMessage(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(max_length=12, choices=[('user', 'Usuário'), ('assistant', 'Assistente')])
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']


class QuizAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    annotation = models.ForeignKey(ImageAnnotation, null=True, on_delete=models.SET_NULL, related_name='attempts')
    question_id = models.PositiveBigIntegerField()
    category = models.CharField(max_length=24)
    correct_text = models.CharField(max_length=500)
    correct_text_es = models.CharField(max_length=500, blank=True)
    answer = models.CharField(max_length=500)
    used_open_answer = models.BooleanField()
    correct = models.BooleanField()
    points = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']

class SistemaAnatomico(models.Model):
    nome = models.CharField(max_length=100)  # Ex: Esquelético, Muscular, Digestório
    descricao = models.TextField(blank=True)

    class Meta:
        verbose_name = "Sistema Anatômico"
        verbose_name_plural = "Sistemas Anatômicos"

    def __str__(self):
        return self.nome

class PecaAnatomica(models.Model):
    sistema = models.ForeignKey(SistemaAnatomico, on_delete=models.CASCADE, related_name='pecas')
    nome = models.CharField(max_length=150)
    descricao = models.TextField(blank=True)
    arquivo_3d = models.FileField(upload_to='pecas_3d/', blank=True, null=True, help_text="Arquivo .glb ou .gltf")
    total_frames = models.PositiveIntegerField(default=24, blank=True, null=True)

    class Meta:
        verbose_name = "Peça Anatômica"
        verbose_name_plural = "Peças Anatômicas"

    def __str__(self):
        return f"{self.nome} ({self.sistema.nome})"

class FramePeca(models.Model):
    peca = models.ForeignKey(PecaAnatomica, on_delete=models.CASCADE, related_name='frames')
    numero_frame = models.PositiveIntegerField(help_text="Índice da imagem (ex: 0 a 23)")
    imagem = models.ImageField(upload_to='pecas_360/')

    class Meta:
        verbose_name = "Frame da Peça"
        verbose_name_plural = "Frames da Peça"
        ordering = ['numero_frame']

    def __str__(self):
        return f"{self.peca.nome} - Frame {self.numero_frame}"

class PerguntaEstrutura(models.Model):
    peca = models.ForeignKey(PecaAnatomica, on_delete=models.CASCADE, related_name='perguntas')
    frame_alvo = models.PositiveIntegerField(help_text="Índice do frame em que a seta deve apontar")
    posicao_x = models.FloatField(help_text="Posição horizontal da seta em % (0 a 100)")
    posicao_y = models.FloatField(help_text="Posição vertical da seta em % (0 a 100)")
    
    resposta_correta = models.CharField(max_length=150, help_text="Nome canônico da estrutura (ex: Foramen magnum)")
    sinonimos = models.TextField(blank=True, help_text="Sinônimos aceitos separados por vírgula")
    
    opcao_a = models.CharField(max_length=150, help_text="Alternativa 1")
    opcao_b = models.CharField(max_length=150, help_text="Alternativa 2")
    opcao_c = models.CharField(max_length=150, help_text="Alternativa 3")
    opcao_d = models.CharField(max_length=150, help_text="Alternativa 4")

    pontos_recall = models.IntegerField(default=20, help_text="Pontos por resposta aberta direta")
    pontos_multipla_escolha = models.IntegerField(default=10, help_text="Pontos por escolha de alternativas")

    class Meta:
        verbose_name = "Pergunta / Estrutura"
        verbose_name_plural = "Perguntas / Estruturas"

    def __str__(self):
        return f"{self.peca.nome} - {self.resposta_correta} (Frame {self.frame_alvo})"
