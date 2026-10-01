from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AIQueryView,
    ChatHistoryView,
    ChatStatusView,
    CurrentUserView,
    DashboardView,
    HealthView,
    LoginView,
    LogoutView,
    PecaAnatomicaViewSet,
    RegisterView,
    ProgressView,
    QuizQuestionsView,
    QuizAnswerView,
    SistemaAnatomicoViewSet,
    UploadedImageViewSet,
    UserNotificationViewSet,
)

router = DefaultRouter()
router.register(r'sistemas', SistemaAnatomicoViewSet, basename='sistema')
router.register(r'pecas', PecaAnatomicaViewSet, basename='peca')
router.register(r'imagens', UploadedImageViewSet, basename='imagem')
router.register(r'notificacoes', UserNotificationViewSet, basename='notificacao')

urlpatterns = [
    path('health/', HealthView.as_view(), name='health'),
    path('auth/registro/', RegisterView.as_view(), name='auth-registro'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('ia/perguntar/', AIQueryView.as_view(), name='ia-perguntar'),
    path('ia/historico/', ChatHistoryView.as_view(), name='ia-historico'),
    path('ia/status/', ChatStatusView.as_view(), name='ia-status'),
    path('quiz/perguntas/', QuizQuestionsView.as_view(), name='quiz-perguntas'),
    path('quiz/responder/', QuizAnswerView.as_view(), name='quiz-responder'),
    path('progresso/', ProgressView.as_view(), name='progresso'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
