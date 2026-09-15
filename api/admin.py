from django.contrib import admin
from .models import SistemaAnatomico, PecaAnatomica, FramePeca, PerguntaEstrutura

class FramePecaInline(admin.TabularInline):
    model = FramePeca
    extra = 1

class PerguntaEstruturaInline(admin.StackedInline):
    model = PerguntaEstrutura
    extra = 1

@admin.register(SistemaAnatomico)
class SistemaAnatomicoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'descricao')

@admin.register(PecaAnatomica)
class PecaAnatomicaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'sistema', 'total_frames')
    inlines = [FramePecaInline, PerguntaEstruturaInline]

@admin.register(PerguntaEstrutura)
class PerguntaEstruturaAdmin(admin.ModelAdmin):
    list_display = ('resposta_correta', 'peca', 'frame_alvo', 'posicao_x', 'posicao_y')