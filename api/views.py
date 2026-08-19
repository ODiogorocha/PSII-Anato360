from rest_framework import viewsets
from .models import SistemaAnatomico, PecaAnatomica
from .serializers import SistemaAnatomicoSerializer, PecaAnatomicaSerializer

class SistemaAnatomicoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista todos os sistemas anatômicos cadastrados.
    """
    queryset = SistemaAnatomico.objects.all()
    serializer_class = SistemaAnatomicoSerializer

class PecaAnatomicaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista todas as peças anatômicas ou detalha uma peça específica com seus frames e perguntas.
    """
    queryset = PecaAnatomica.objects.all().prefetch_related('frames', 'perguntas')
    serializer_class = PecaAnatomicaSerializer