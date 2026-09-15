from rest_framework import serializers
from .models import SistemaAnatomico, PecaAnatomica, FramePeca, PerguntaEstrutura

class SistemaAnatomicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SistemaAnatomico
        fields = ['id', 'nome', 'descricao']

class PerguntaEstruturaSerializer(serializers.ModelSerializer):
    opcoes = serializers.SerializerMethodField()

    class Meta:
        model = PerguntaEstrutura
        fields = [
            'id', 
            'frame_alvo', 
            'posicao_x', 
            'posicao_y', 
            'resposta_correta', 
            'sinonimos', 
            'opcoes', 
            'pontos_recall', 
            'pontos_multipla_escolha'
        ]

    def get_opcoes(self, obj):
        return [obj.opcao_a, obj.opcao_b, obj.opcao_c, obj.opcao_d]

class FramePecaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FramePeca
        fields = ['numero_frame', 'imagem']

class PecaAnatomicaSerializer(serializers.ModelSerializer):
    sistema_nome = serializers.ReadOnlyField(source='sistema.nome')
    frames = FramePecaSerializer(many=True, read_only=True)
    perguntas = PerguntaEstruturaSerializer(many=True, read_only=True)

    class Meta:
        model = PecaAnatomica
        fields = [
            'id', 
            'nome', 
            'descricao', 
            'sistema', 
            'sistema_nome', 
            'arquivo_3d',
            'total_frames', 
            'frames', 
            'perguntas'
        ]