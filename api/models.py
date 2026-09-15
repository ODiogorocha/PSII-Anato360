from django.db import models
from django.contrib.auth.models import User

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