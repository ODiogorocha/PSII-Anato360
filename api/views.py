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
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        try:
            self.assistant = StudyAssistant()
        except Exception:
            self.assistant = None

    def post(self, request):
        pergunta = request.data.get('pergunta')
        if not pergunta:
            return Response({"erro": "A pergunta é obrigatória."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not self.assistant:
            return Response({"erro": "O assistente de IA não pôde ser inicializado."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            # Substitua 'answer' pelo nome exato do método da sua classe StudyAssistant (ex: .ask(), .perguntar(), etc.)
            # Se não tiver certeza, teste qual método a classe usa para receber a pergunta.
            resposta = self.assistant.ask(pergunta)
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
            
            # Instancia o StudyAssistant e carrega o PDF para a base vetorial/Ollama
            assistant = StudyAssistant()
            if hasattr(assistant, 'load_pdf'):
                assistant.load_pdf(full_path)
            
            # Remove o ficheiro temporário após o carregamento, se necessário
            if os.path.exists(full_path):
                os.remove(full_path)
                
            return Response({"mensagem": f"PDF '{pdf_file.name}' indexado com sucesso!"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)