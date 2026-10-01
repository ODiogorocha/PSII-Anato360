from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import (
    FramePeca,
    ChatMessage,
    ImageAnnotation,
    PecaAnatomica,
    PerguntaEstrutura,
    SistemaAnatomico,
    UploadedImage,
    UserNotification,
    UserProfile,
)


class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    nome = serializers.CharField(max_length=150)
    instituicao = serializers.CharField(max_length=180)
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

    def validate(self, attrs):
        candidate = User(
            username=attrs['email'],
            email=attrs['email'],
            first_name=attrs['nome'].strip(),
        )
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({'password': error.messages}) from error
        return attrs

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists() or User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Já existe uma conta com este e-mail.')
        return value

    def create(self, validated_data):
        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=validated_data['email'],
                    email=validated_data['email'],
                    first_name=validated_data['nome'].strip(),
                    password=validated_data['password'],
                )
                UserProfile.objects.create(user=user, institution=validated_data['instituicao'].strip())
        except IntegrityError as error:
            raise serializers.ValidationError({'email': 'Já existe uma conta com este e-mail.'}) from error
        return user


class UserSerializer(serializers.ModelSerializer):
    nome = serializers.CharField(source='first_name', read_only=True)
    instituicao = serializers.SerializerMethodField()
    is_admin = serializers.BooleanField(source='is_staff', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'nome', 'instituicao', 'is_admin']

    def get_instituicao(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.institution if profile else ''


class SistemaAnatomicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SistemaAnatomico
        fields = ['id', 'nome', 'descricao']


class PerguntaEstruturaSerializer(serializers.ModelSerializer):
    opcoes = serializers.SerializerMethodField()

    class Meta:
        model = PerguntaEstrutura
        fields = [
            'id', 'frame_alvo', 'posicao_x', 'posicao_y', 'resposta_correta',
            'sinonimos', 'opcoes', 'pontos_recall', 'pontos_multipla_escolha',
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
            'id', 'nome', 'descricao', 'sistema', 'sistema_nome', 'arquivo_3d',
            'total_frames', 'frames', 'perguntas',
        ]


class ImageAnnotationSerializer(serializers.ModelSerializer):
    posicao_normalizada = serializers.SerializerMethodField()

    class Meta:
        model = ImageAnnotation
        fields = [
            'id', 'text', 'text_es', 'confirmed', 'x', 'y', 'confidence', 'polygon',
            'bounding_box', 'normalized_x', 'normalized_y', 'posicao_normalizada',
        ]

    def get_posicao_normalizada(self, obj):
        if obj.normalized_x is None or obj.normalized_y is None:
            return None
        return {'x': obj.normalized_x, 'y': obj.normalized_y}


class UploadedImageSerializer(serializers.ModelSerializer):
    original_file = serializers.ImageField(write_only=True)
    owner_id = serializers.IntegerField(read_only=True)
    owner_name = serializers.CharField(source='owner.first_name', read_only=True)
    original_path = serializers.CharField(source='original_file.name', read_only=True)
    processed_path = serializers.CharField(source='processed_file.name', read_only=True)
    annotations = ImageAnnotationSerializer(many=True, read_only=True)
    original_url = serializers.SerializerMethodField()
    processed_url = serializers.SerializerMethodField()

    class Meta:
        model = UploadedImage
        fields = [
            'id', 'owner_id', 'owner_name', 'original_file', 'original_path', 'processed_path',
            'allow_sharing', 'status', 'processing_metadata', 'error_message',
            'created_at', 'processed_at', 'annotations',
            'title', 'title_es', 'description', 'description_es', 'category', 'use_ollama',
            'original_url', 'processed_url',
        ]
        read_only_fields = [
            'id', 'owner_id', 'owner_name', 'original_path', 'processed_path',
            'status', 'processing_metadata', 'error_message', 'created_at',
            'processed_at', 'annotations',
        ]

    def get_original_url(self, obj):
        return f'/api/imagens/{obj.pk}/arquivo/original/'

    def get_processed_url(self, obj):
        return f'/api/imagens/{obj.pk}/arquivo/processada/' if obj.processed_file else None

    def validate(self, attrs):
        if self.instance is not None and 'original_file' in attrs:
            raise serializers.ValidationError({'original_file': 'Envie uma nova imagem para substituir o arquivo original.'})
        return attrs
    def validate_original_file(self, value):
        if value.size > 20 * 1024 * 1024:
            raise serializers.ValidationError('A imagem deve ter no máximo 20 MB.')
        if value.content_type not in {'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}:
            raise serializers.ValidationError('Formato aceito: JPEG, PNG, WebP, BMP ou TIFF.')
        return value


class UserNotificationSerializer(serializers.ModelSerializer):
    image_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = UserNotification
        fields = ['id', 'image_id', 'message', 'is_read', 'created_at']
        read_only_fields = fields


class MarkerSerializer(serializers.Serializer):
    # The Figma editor uses percentages. Persistent OCR positions remain pixels.
    id = serializers.IntegerField(required=False)
    label = serializers.CharField(max_length=500)
    label_es = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    x = serializers.FloatField(min_value=0, max_value=100)
    y = serializers.FloatField(min_value=0, max_value=100)
    confirmed = serializers.BooleanField(default=True)

    def validate(self, attrs):
        import math
        if not math.isfinite(attrs['x']) or not math.isfinite(attrs['y']):
            raise serializers.ValidationError('As coordenadas devem ser números finitos.')
        return attrs


class MarkersUpdateSerializer(serializers.Serializer):
    annotations = MarkerSerializer(many=True, max_length=500)


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'created_at']
        read_only_fields = fields


class ChatQuerySerializer(serializers.Serializer):
    pergunta = serializers.CharField(max_length=8000)
    imagem_id = serializers.IntegerField(min_value=1, required=False)
    idioma = serializers.ChoiceField(choices=['pt', 'es'], default='pt')


class QuizAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(min_value=1)
    answer = serializers.CharField(max_length=500)
    used_open_answer = serializers.BooleanField(default=True)


class ProfileUpdateSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=150, required=False)
    instituicao = serializers.CharField(max_length=180, required=False)
