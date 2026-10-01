import os
import random
import logging
import unicodedata

from django.contrib.auth import authenticate, get_user_model
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    ChatMessage, ImageAnnotation, PecaAnatomica, QuizAttempt, SistemaAnatomico,
    UploadedImage, UserNotification, UserProfile,
)
from .serializers import (
    ChatMessageSerializer,
    ChatQuerySerializer,
    MarkersUpdateSerializer,
    PecaAnatomicaSerializer,
    RegistrationSerializer,
    ProfileUpdateSerializer,
    QuizAnswerSerializer,
    SistemaAnatomicoSerializer,
    UploadedImageSerializer,
    UserNotificationSerializer,
    UserSerializer,
)


from IA_module.study_assistant import StudyAssistant
from IA_module.ollama_client import OllamaClientError

study_assistant = StudyAssistant()
logger = logging.getLogger(__name__)


def visible_images(user):
    images = UploadedImage.objects.select_related('owner').prefetch_related('annotations')
    return images if user.is_staff else images.filter(Q(owner=user) | Q(allow_sharing=True))


def require_image_owner(user, image):
    if image.owner_id != user.pk and not user.is_staff:
        raise PermissionDenied('Somente o proprietário ou um administrador pode alterar esta imagem.')


def enqueue_image(image_id):
    from .tasks import process_uploaded_image
    try:
        process_uploaded_image.delay(image_id)
    except Exception:
        logger.exception('Unable to enqueue image %s', image_id)
        UploadedImage.objects.filter(pk=image_id).update(
            status=UploadedImage.Status.FAILED,
            error_message='Não foi possível iniciar o processamento. Tente reprocessar a imagem.',
        )


class HealthView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        return Response({'status': 'ok'})


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw_email = request.data.get('email')
        password = request.data.get('password')
        if not isinstance(raw_email, str) or not isinstance(password, str) or not raw_email.strip() or not password:
            return Response(
                {'detail': 'Informe um e-mail e uma senha.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = raw_email.strip().lower()
        user_model = get_user_model()
        account = user_model.objects.filter(email__iexact=email).order_by('pk').first()
        username = account.get_username() if account else email
        user = authenticate(request, username=username, password=password)
        if user is None or not user.is_active:
            return Response({'detail': 'E-mail ou senha inválidos.'}, status=status.HTTP_400_BAD_REQUEST)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            if 'nome' in serializer.validated_data:
                request.user.first_name = serializer.validated_data['nome']
                request.user.save(update_fields=['first_name'])
            if 'instituicao' in serializer.validated_data:
                UserProfile.objects.update_or_create(
                    user=request.user, defaults={'institution': serializer.validated_data['instituicao']},
                )
        request.user.refresh_from_db()
        return Response(UserSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.auth:
            request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SistemaAnatomicoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SistemaAnatomico.objects.all()
    serializer_class = SistemaAnatomicoSerializer


class PecaAnatomicaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PecaAnatomica.objects.all().prefetch_related('frames', 'perguntas')
    serializer_class = PecaAnatomicaSerializer


class UploadedImageViewSet(viewsets.ModelViewSet):
    serializer_class = UploadedImageSerializer
    http_method_names = ['get', 'post', 'patch', 'put', 'delete', 'head', 'options']
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = visible_images(self.request.user)
        if self.request.query_params.get('mine') in {'true', '1'}:
            queryset = queryset.filter(owner=self.request.user)
        category = self.request.query_params.get('category')
        return queryset.filter(category=category) if category else queryset

    def perform_create(self, serializer):
        image = serializer.save(owner=self.request.user, status=UploadedImage.Status.QUEUED)
        transaction.on_commit(lambda: enqueue_image(image.pk))

    def perform_update(self, serializer):
        require_image_owner(self.request.user, serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        require_image_owner(self.request.user, instance)
        files = [instance.original_file, instance.processed_file]
        with transaction.atomic():
            instance.delete()
            for field in files:
                if field:
                    transaction.on_commit(lambda field=field: field.delete(save=False))

    @action(detail=True, methods=['put'], url_path='rotulos')
    def rotulos(self, request, pk=None):
        image = self.get_object()
        require_image_owner(request.user, image)
        if image.status != UploadedImage.Status.READY:
            return Response({'detail': 'Aguarde o processamento antes de editar os rótulos.'}, status=409)
        serializer = MarkersUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        width = image.processing_metadata.get('width') or 1
        height = image.processing_metadata.get('height') or 1
        with transaction.atomic():
            image.annotations.all().delete()
            ImageAnnotation.objects.bulk_create([
                ImageAnnotation(
                    image=image, text=marker['label'], text_es=marker['label_es'],
                    confirmed=marker['confirmed'], x=marker['x'] * width / 100,
                    y=marker['y'] * height / 100, normalized_x=marker['x'] / 100,
                    normalized_y=marker['y'] / 100,
                )
                for marker in serializer.validated_data['annotations']
            ])
        image.refresh_from_db()
        return Response(self.get_serializer(image).data)

    @action(detail=True, methods=['post'], url_path='reprocessar')
    def reprocessar(self, request, pk=None):
        image = self.get_object()
        require_image_owner(request.user, image)
        with transaction.atomic():
            image = UploadedImage.objects.select_for_update().get(pk=image.pk)
            if image.status in {UploadedImage.Status.QUEUED, UploadedImage.Status.PROCESSING}:
                return Response({'detail': 'A imagem já está na fila de processamento.'}, status=409)
            image.status = UploadedImage.Status.QUEUED
            image.error_message = ''
            image.save(update_fields=['status', 'error_message'])
            transaction.on_commit(lambda: enqueue_image(image.pk))
        return Response(self.get_serializer(image).data, status=202)

    @action(detail=True, methods=['get'], url_path='quiz')
    def quiz(self, request, pk=None):
        image = self.get_object()
        if image.status != UploadedImage.Status.READY:
            return Response({'detail': 'O quiz estará disponível quando o processamento terminar.'}, status=409)
        labels = list(image.annotations.all())
        questions = []
        for annotation in labels:
            distractors = [item.text for item in labels if item.pk != annotation.pk]
            choices = [annotation.text, *distractors[:3]]
            random.Random(f'{image.pk}:{annotation.pk}').shuffle(choices)
            questions.append({
                'id': annotation.pk,
                'pergunta': 'Qual nome estava no rótulo removido desta posição?',
                'posicao': {'x': annotation.x, 'y': annotation.y},
                'resposta_correta': annotation.text,
                'opcoes': choices,
            })
        return Response({
            'imagem_id': image.pk,
            'status': image.status,
            'arquivo_processado': f'/api/imagens/{image.pk}/arquivo/processada/',
            'largura': image.processing_metadata.get('width'),
            'altura': image.processing_metadata.get('height'),
            'perguntas': questions,
        })

    @action(detail=True, methods=['get'], url_path='arquivo/(?P<kind>original|processada)')
    def arquivo(self, request, pk=None, kind=None):
        image = self.get_object()
        image_field = image.original_file if kind == 'original' else image.processed_file
        if not image_field:
            return Response({'detail': 'Este arquivo ainda não está disponível.'}, status=404)
        try:
            response = FileResponse(image_field.open('rb'), filename=os.path.basename(image_field.name))
        except FileNotFoundError:
            return Response({'detail': 'Arquivo não encontrado no armazenamento.'}, status=404)
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class UserNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='marcar-lida')
    def marcar_lida(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(UserNotificationSerializer(notification).data)


class AIQueryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChatQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data['pergunta']
        context = None
        image_id = serializer.validated_data.get('imagem_id')
        if image_id:
            image = get_object_or_404(visible_images(request.user), pk=image_id)
            labels = ', '.join(image.annotations.values_list('text', flat=True))
            context = f'Imagem: {image.title}. Sistema: {image.category}. Descrição: {image.description}. Rótulos: {labels}'
        history = list(reversed(list(
            ChatMessage.objects.filter(user=request.user).order_by('-id').values('role', 'content')[:20]
        )))
        try:
            answer = study_assistant.chat(
                question, history=history, context=context,
                language=serializer.validated_data['idioma'],
            )
        except (OllamaClientError, RuntimeError):
            logger.exception('Ollama chat unavailable')
            return Response(
                {'detail': 'O assistente está indisponível no momento. Verifique se o Ollama e o modelo estão prontos.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        with transaction.atomic():
            messages = [
                ChatMessage.objects.create(user=request.user, role='user', content=question),
                ChatMessage.objects.create(user=request.user, role='assistant', content=answer),
            ]
        return Response({'resposta': answer, 'messages': ChatMessageSerializer(messages, many=True).data})


class ChatStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(study_assistant.ollama.chat_status())


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(ChatMessageSerializer(ChatMessage.objects.filter(user=request.user), many=True).data)

    def delete(self, request):
        ChatMessage.objects.filter(user=request.user).delete()
        return Response(status=204)


def serialize_attempt(attempt):
    return {
        'questionId': str(attempt.question_id), 'system': attempt.category,
        'correct_pt': attempt.correct_text,
        'correct_es': attempt.correct_text_es or attempt.correct_text,
        'usedOpenAnswer': attempt.used_open_answer, 'correct': attempt.correct,
        'points': attempt.points, 'timestamp': int(attempt.created_at.timestamp() * 1000),
    }


def available_questions(user):
    return ImageAnnotation.objects.filter(
        image__in=visible_images(user).filter(status=UploadedImage.Status.READY), confirmed=True,
    ).select_related('image')


class QuizQuestionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        questions = available_questions(request.user)
        category = request.query_params.get('system', 'all')
        if category != 'all':
            questions = questions.filter(image__category=category)
        try:
            limit = max(1, min(30, int(request.query_params.get('limit', 10))))
        except (TypeError, ValueError):
            raise ValidationError({'limit': 'Informe um número inteiro.'})
        pool = list(questions)
        selected = random.sample(pool, min(limit, len(pool)))
        result = []
        for annotation in selected:
            image = annotation.image
            alternatives = [item for item in pool if item.pk != annotation.pk and item.text != annotation.text]
            random.shuffle(alternatives)
            options = [annotation, *alternatives[:3]]
            random.shuffle(options)
            width = image.processing_metadata.get('width') or 1
            height = image.processing_metadata.get('height') or 1
            nx = annotation.normalized_x if annotation.normalized_x is not None else annotation.x / width
            ny = annotation.normalized_y if annotation.normalized_y is not None else annotation.y / height
            result.append({
                'id': str(annotation.pk), 'image_id': image.pk, 'system': image.category,
                'imageUrl': f'/api/imagens/{image.pk}/arquivo/processada/',
                'imageAlt_pt': image.title or image.description or 'Peça anatômica',
                'imageAlt_es': image.title_es or image.description_es or image.title or 'Pieza anatómica',
                'marker': {'x': nx * 100, 'y': ny * 100},
                'correct_pt': annotation.text, 'correct_es': annotation.text_es or annotation.text,
                'options_pt': [item.text for item in options],
                'options_es': [item.text_es or item.text for item in options],
            })
        return Response(result)


class QuizAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QuizAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        annotation = get_object_or_404(available_questions(request.user), pk=values['question_id'])

        def normalized(text):
            text = ''.join(char for char in unicodedata.normalize('NFD', text.casefold()) if not unicodedata.combining(char))
            return ' '.join(text.split())

        accepted = {normalized(annotation.text)}
        if annotation.text_es:
            accepted.add(normalized(annotation.text_es))
        correct = normalized(values['answer']) in accepted
        open_answer = values['used_open_answer']
        # A failed recall attempt unlocks the alternatives without recording a second result.
        if open_answer and not correct:
            return Response({'correct': False, 'points': 0, 'requires_choice': True})
        points = (20 if open_answer else 10) if correct else 0
        attempt = QuizAttempt.objects.create(
            user=request.user, annotation=annotation, question_id=annotation.pk,
            category=annotation.image.category, correct_text=annotation.text,
            correct_text_es=annotation.text_es, answer=values['answer'],
            used_open_answer=open_answer, correct=correct, points=points,
        )
        return Response({
            'correct': correct, 'points': points, 'requires_choice': False,
            'result': serialize_attempt(attempt),
        })


class ProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        results = [serialize_attempt(item) for item in QuizAttempt.objects.filter(user=request.user)]
        return Response({'totalPoints': sum(item['points'] for item in results), 'results': results})


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        images = visible_images(request.user)
        return Response({
            'images': images.count(),
            'ready_images': images.filter(status=UploadedImage.Status.READY).count(),
            'own_images': images.filter(owner=request.user).count(),
            'questions': available_questions(request.user).count(),
            'unread_notifications': request.user.notifications.filter(is_read=False).count(),
        })


class UploadPDFView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        if 'pdf' not in request.FILES:
            return Response({'erro': 'Nenhum ficheiro PDF foi enviado.'}, status=status.HTTP_400_BAD_REQUEST)
        pdf_file = request.FILES['pdf']
        file_path = None
        try:
            file_path = default_storage.save(pdf_file.name, pdf_file)
            full_path = default_storage.path(file_path)
            doc_id = study_assistant.load_pdf(full_path)
            return Response({'mensagem': f"PDF '{pdf_file.name}' indexado com sucesso!", 'doc_id': doc_id})
        except Exception as error:
            return Response({'erro': str(error)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if file_path:
                default_storage.delete(file_path)
