from rest_framework import viewsets
from .models import SistemaAnatomico, PecaAnatomica
from .serializers import SistemaAnatomicoSerializer, PecaAnatomicaSerializer
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage

import sys
import os


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../IA_module')))
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

from IA_module.study_assistant import StudyAssistant

# The vector index is in memory, so uploads and queries must share an instance.
study_assistant = StudyAssistant()

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

class AIQueryView(APIView):
    assistant = study_assistant

    def post(self, request):
        pergunta = request.data.get('pergunta')
        if not pergunta:
            return Response({"erro": "A pergunta é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resposta = study_assistant.ask(pergunta)
            return Response({"resposta": resposta}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        

class UploadPDFView(APIView):
    def post(self, request):
        if 'pdf' not in request.FILES:
            return Response({"erro": "Nenhum ficheiro PDF foi enviado."}, status=status.HTTP_400_BAD_REQUEST)
        
        pdf_file = request.FILES['pdf']
        
        try:
            # Guarda o ficheiro temporariamente no servidor
            file_path = default_storage.save(pdf_file.name, pdf_file)
            full_path = default_storage.path(file_path)
            
            # Carrega no mesmo índice consultado pelo endpoint de perguntas.
            doc_id = study_assistant.load_pdf(full_path)
            
            # Remove o ficheiro temporário após o carregamento, se necessário
            if os.path.exists(full_path):
                os.remove(full_path)
                
            return Response(
                {
                    "mensagem": f"PDF '{pdf_file.name}' indexado com sucesso!",
                    "doc_id": doc_id,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
