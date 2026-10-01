from django.contrib import admin
from .models import (
    FramePeca,
    ImageAnnotation,
    PecaAnatomica,
    QuizAttempt,
    PerguntaEstrutura,
    SistemaAnatomico,
    UploadedImage,
    UserNotification,
    UserProfile,
)

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


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'institution')
    search_fields = ('user__email', 'institution')


class ImageAnnotationInline(admin.TabularInline):
    model = ImageAnnotation
    extra = 0
    readonly_fields = ('text', 'x', 'y', 'confidence', 'bounding_box')


@admin.register(UploadedImage)
class UploadedImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'owner', 'status', 'allow_sharing', 'created_at', 'processed_at')
    list_filter = ('status', 'allow_sharing', 'created_at')
    search_fields = ('owner__email', 'owner__first_name')
    readonly_fields = ('status', 'processing_metadata', 'error_message', 'created_at', 'processed_at')
    inlines = [ImageAnnotationInline]


@admin.register(UserNotification)
class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'image', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'correct_text', 'correct', 'points', 'created_at')
    list_filter = ('category', 'correct')
    readonly_fields = ('created_at',)
