from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SistemaAnatomicoViewSet, PecaAnatomicaViewSet

router = DefaultRouter()
router.register(r'sistemas', SistemaAnatomicoViewSet, basename='sistema')
router.register(r'pecas', PecaAnatomicaViewSet, basename='peca')

urlpatterns = [
    path('', include(router.urls)),
]