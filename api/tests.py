from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
import base64
import io
import tempfile
from unittest.mock import Mock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from IA_module.ollama_client import OllamaClientError

from .models import ChatMessage, ImageAnnotation, QuizAttempt, UploadedImage, UserNotification
from .tasks import process_uploaded_image


def png_bytes():
    stream = io.BytesIO()
    Image.new('RGB', (40, 20), 'white').save(stream, format='PNG')
    return stream.getvalue()


def uploaded_png(name='anatomia.png'):
    return SimpleUploadedFile(name, png_bytes(), content_type='image/png')


class UserRegistrationTests(TestCase):
    password = 'Anato360!Study-User-2026'

    def setUp(self):
        self.client = APIClient()
        self.registration_data = {
            'nome': 'Ana Exemplo',
            'email': 'Ana.Exemplo@example.org',
            'instituicao': 'UFSM',
            'password': self.password,
        }

    def test_register_creates_user_profile_and_authenticated_session(self):
        response = self.client.post('/api/auth/registro/', self.registration_data, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['token'])
        self.assertEqual(response.data['user']['email'], 'ana.exemplo@example.org')
        self.assertEqual(response.data['user']['nome'], 'Ana Exemplo')
        self.assertEqual(response.data['user']['instituicao'], 'UFSM')
        self.assertFalse(response.data['user']['is_admin'])

        user = User.objects.get(email='ana.exemplo@example.org')
        self.assertEqual(user.username, 'ana.exemplo@example.org')
        self.assertTrue(user.check_password(self.password))
        self.assertNotEqual(user.password, self.password)
        self.assertEqual(user.profile.institution, 'UFSM')

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        current_user = self.client.get('/api/auth/me/')
        self.assertEqual(current_user.status_code, 200)
        self.assertEqual(current_user.data['id'], user.id)

        logout = self.client.post('/api/auth/logout/')
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_login_is_case_insensitive_for_email(self):
        self.client.post('/api/auth/registro/', self.registration_data, format='json')

        response = self.client.post(
            '/api/auth/login/',
            {'email': 'ANA.EXEMPLO@EXAMPLE.ORG', 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['token'])
        self.assertEqual(response.data['user']['email'], 'ana.exemplo@example.org')

    def test_login_uses_email_for_accounts_created_before_registration(self):
        User.objects.create_user(
            username='ana-antiga',
            email='ana.antiga@example.org',
            password=self.password,
            first_name='Ana Antiga',
        )

        response = self.client.post(
            '/api/auth/login/',
            {'email': 'ANA.ANTIGA@example.org', 'password': self.password},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['nome'], 'Ana Antiga')

    def test_duplicate_email_is_rejected(self):
        self.client.post('/api/auth/registro/', self.registration_data, format='json')
        duplicate = {**self.registration_data, 'email': 'ANA.EXEMPLO@example.org'}

        response = self.client.post('/api/auth/registro/', duplicate, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)
        self.assertEqual(User.objects.filter(username__iexact='ana.exemplo@example.org').count(), 1)

    def test_weak_password_is_rejected(self):
        data = {**self.registration_data, 'password': 'password'}

        response = self.client.post('/api/auth/registro/', data, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('password', response.data)
        self.assertFalse(User.objects.filter(email__iexact=self.registration_data['email']).exists())


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint_checks_database_and_returns_ok(self):
        response = self.client.get('/api/health/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'status': 'ok'})


class ImageAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(username='owner', email='owner@example.org')
        cls.other = User.objects.create_user(username='other', email='other@example.org')
        cls.admin = User.objects.create_user(username='admin', is_staff=True)

    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.media_override = override_settings(MEDIA_ROOT=self.media.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.private_image = UploadedImage.objects.create(
            owner=self.owner, original_file=uploaded_png(), processed_file=uploaded_png('processed.png'),
            title='Crânio', status=UploadedImage.Status.READY,
            processing_metadata={'width': 40, 'height': 20},
        )
        self.label = ImageAnnotation.objects.create(
            image=self.private_image, text='Clavícula', text_es='Clavícula', x=10, y=5,
            normalized_x=0.25, normalized_y=0.25, confirmed=True,
        )

    def test_upload_queues_processing_with_owner_and_selected_ollama_mode(self):
        with patch('api.tasks.process_uploaded_image.delay') as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post('/api/imagens/', {
                    'original_file': uploaded_png(), 'title': 'Tórax', 'category': 'respiratory',
                    'allow_sharing': 'true', 'use_ollama': 'false', 'owner_id': self.other.pk,
                    'status': 'ready', 'processing_metadata': '{"forged": true}',
                }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        image = UploadedImage.objects.get(pk=response.data['id'])
        self.assertEqual(image.owner, self.owner)
        self.assertEqual(image.status, UploadedImage.Status.QUEUED)
        self.assertEqual(image.processing_metadata, {})
        self.assertTrue(image.allow_sharing)
        self.assertFalse(image.use_ollama)
        enqueue.assert_called_once_with(image.pk)

    def test_other_user_cannot_list_view_download_or_edit_private_upload(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/imagens/').data, [])
        for suffix in ['', 'arquivo/original/', 'arquivo/processada/', 'quiz/']:
            self.assertEqual(self.client.get(f'/api/imagens/{self.private_image.pk}/{suffix}').status_code, 404)
        self.assertEqual(self.client.patch(f'/api/imagens/{self.private_image.pk}/', {'allow_sharing': True}).status_code, 404)

    def test_public_image_is_readable_but_only_owner_or_admin_can_edit_delete(self):
        self.private_image.allow_sharing = True
        self.private_image.save()
        self.client.force_authenticate(self.other)
        self.assertEqual(len(self.client.get('/api/imagens/').data), 1)
        download = self.client.get(f'/api/imagens/{self.private_image.pk}/arquivo/processada/')
        self.assertEqual(download.status_code, 200)
        self.assertEqual(b''.join(download.streaming_content), png_bytes())
        self.assertEqual(download['Cache-Control'], 'private, no-store')
        self.assertEqual(self.client.patch(f'/api/imagens/{self.private_image.pk}/', {'title': 'alterado'}).status_code, 403)
        self.assertEqual(self.client.delete(f'/api/imagens/{self.private_image.pk}/').status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(f'/api/imagens/{self.private_image.pk}/', {'title': 'Revisado'}).status_code, 200)

    def test_changing_visibility_revokes_access_and_mine_filter(self):
        self.client.patch(f'/api/imagens/{self.private_image.pk}/', {'allow_sharing': True}, format='json')
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/imagens/{self.private_image.pk}/').status_code, 200)
        self.assertEqual(self.client.get('/api/imagens/?mine=true').data, [])
        self.client.force_authenticate(self.owner)
        self.client.patch(f'/api/imagens/{self.private_image.pk}/', {'allow_sharing': False}, format='json')
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f'/api/imagens/{self.private_image.pk}/arquivo/original/').status_code, 404)

    def test_owner_delete_removes_files_after_transaction(self):
        original = self.private_image.original_file.name
        processed = self.private_image.processed_file.name
        storage = self.private_image.original_file.storage
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(f'/api/imagens/{self.private_image.pk}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(storage.exists(original))
        self.assertFalse(storage.exists(processed))
        self.assertFalse(UploadedImage.objects.filter(pk=self.private_image.pk).exists())

    def test_raw_media_path_cannot_bypass_authorization(self):
        self.client.force_authenticate(None)
        response = self.client.get(f'/media/{self.private_image.original_file.name}')
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.get(f'/api/imagens/{self.private_image.pk}/arquivo/original/').status_code, 401)

    def test_marker_editor_converts_percentages_and_persists_bilingual_labels(self):
        response = self.client.put(f'/api/imagens/{self.private_image.pk}/rotulos/', {
            'annotations': [{'label': 'Fêmur', 'label_es': 'Fémur', 'x': 75, 'y': 50, 'confirmed': True}],
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        label = self.private_image.annotations.get()
        self.assertEqual((label.x, label.y), (30, 10))
        self.assertEqual((label.normalized_x, label.normalized_y), (0.75, 0.5))
        self.assertEqual(label.text_es, 'Fémur')
        self.assertTrue(label.confirmed)
        bad = self.client.put(f'/api/imagens/{self.private_image.pk}/rotulos/', {
            'annotations': [{'label': 'inválido', 'x': 101, 'y': 50}],
        }, format='json')
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self.private_image.annotations.get().text, 'Fêmur')

    def test_reprocess_rejects_duplicate_queue_and_protects_ownership(self):
        with patch('api.tasks.process_uploaded_image.delay') as enqueue:
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(f'/api/imagens/{self.private_image.pk}/reprocessar/')
        self.assertEqual(response.status_code, 202)
        enqueue.assert_called_once_with(self.private_image.pk)
        self.assertEqual(self.client.post(f'/api/imagens/{self.private_image.pk}/reprocessar/').status_code, 409)

    def test_quiz_excludes_private_or_unconfirmed_labels(self):
        ImageAnnotation.objects.create(image=self.private_image, text='Rótulo não revisado', x=0, y=0)
        response = self.client.get('/api/quiz/perguntas/?system=skeletal')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['marker'], {'x': 25, 'y': 25})
        self.assertEqual(response.data[0]['image_id'], self.private_image.pk)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/quiz/perguntas/').data, [])
        self.assertEqual(self.client.post('/api/quiz/responder/', {
            'question_id': self.label.pk, 'answer': 'Clavícula', 'used_open_answer': True,
        }).status_code, 404)

    def test_quiz_scores_on_server_then_progress_survives_label_deletion(self):
        invalid = self.client.post('/api/quiz/responder/', {
            'question_id': self.label.pk, 'answer': 'Resposta incorreta', 'used_open_answer': True,
        }, format='json')
        self.assertTrue(invalid.data['requires_choice'])
        self.assertEqual(QuizAttempt.objects.count(), 0)
        answer = self.client.post('/api/quiz/responder/', {
            'question_id': self.label.pk, 'answer': ' CLAVICULA ', 'used_open_answer': False,
            'points': 9999, 'correct': False,
        }, format='json')
        self.assertEqual(answer.status_code, 200)
        self.assertEqual(answer.data['points'], 10)
        self.assertTrue(answer.data['correct'])
        self.label.delete()
        progress = self.client.get('/api/progresso/').data
        self.assertEqual(progress['totalPoints'], 10)
        self.assertEqual(progress['results'][0]['correct_pt'], 'Clavícula')
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/progresso/').data, {'totalPoints': 0, 'results': []})

    def test_notification_read_cannot_cross_users(self):
        notice = UserNotification.objects.create(user=self.owner, message='Pronta')
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get('/api/notificacoes/').data, [])
        self.assertEqual(self.client.post(f'/api/notificacoes/{notice.pk}/marcar-lida/').status_code, 404)


class ChatTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='student')
        cls.other = User.objects.create_user(username='other-student')

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_chat_uses_ia_module_and_ollama_without_requiring_pdf(self):
        ChatMessage.objects.create(user=self.user, role='user', content='Estou estudando ossos.')
        ChatMessage.objects.create(user=self.user, role='assistant', content='Qual osso?')
        ChatMessage.objects.create(user=self.other, role='user', content='Conversa privada de outro usuário')
        remote = Mock()
        remote.json.return_value = {'message': {'content': 'O fêmur fica na coxa.'}}
        with patch('IA_module.ollama_client.requests.post', return_value=remote) as ollama:
            response = self.client.post('/api/ia/perguntar/', {'pergunta': 'Onde fica o fêmur?'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['resposta'], 'O fêmur fica na coxa.')
        self.assertTrue(ollama.call_args.args[0].endswith('/api/chat'))
        messages = ollama.call_args.kwargs['json']['messages']
        self.assertEqual(messages[-1]['role'], 'user')
        self.assertIn('Onde fica o fêmur?', messages[-1]['content'])
        self.assertTrue(any(message['content'] == 'Estou estudando ossos.' for message in messages))
        self.assertFalse(any('Conversa privada' in message['content'] for message in messages))
        self.assertEqual(ChatMessage.objects.filter(user=self.user).count(), 4)

    def test_chat_service_failure_is_reported_without_fake_response_or_history(self):
        with patch('api.views.study_assistant.chat', side_effect=OllamaClientError('offline')):
            with self.assertLogs('api.views', level='ERROR'):
                response = self.client.post('/api/ia/perguntar/', {'pergunta': 'O que é um osso?'})
        self.assertEqual(response.status_code, 503)
        self.assertFalse(ChatMessage.objects.exists())

    def test_chat_requires_authentication_and_validates_message(self):
        self.assertEqual(self.client.post('/api/ia/perguntar/', {'pergunta': ' '}).status_code, 400)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/ia/perguntar/', {'pergunta': 'Olá'}).status_code, 401)

    def test_history_clear_is_scoped_to_current_user(self):
        ChatMessage.objects.create(user=self.user, role='user', content='Minha pergunta')
        ChatMessage.objects.create(user=self.other, role='user', content='Outra pergunta')
        history = self.client.get('/api/ia/historico/')
        self.assertEqual(len(history.data), 1)
        self.assertEqual(history.data[0]['content'], 'Minha pergunta')
        self.assertEqual(self.client.delete('/api/ia/historico/').status_code, 204)
        self.assertEqual(ChatMessage.objects.get().user, self.other)

    def test_private_image_cannot_be_used_as_chat_context_by_other_user(self):
        image = UploadedImage.objects.create(owner=self.other, original_file='private.png')
        with patch('api.views.study_assistant.chat') as chat:
            response = self.client.post('/api/ia/perguntar/', {'pergunta': 'Descreva a imagem', 'imagem_id': image.pk})
        self.assertEqual(response.status_code, 404)
        chat.assert_not_called()

    def test_chat_passes_language_and_authorized_image_context(self):
        image = UploadedImage.objects.create(owner=self.user, original_file='bone.png', title='Fêmur')
        ImageAnnotation.objects.create(image=image, text='Cabeça do fêmur', x=10, y=20)
        with patch('api.views.study_assistant.chat', return_value='El fémur.') as chat:
            response = self.client.post('/api/ia/perguntar/', {
                'pergunta': 'Explique', 'imagem_id': image.pk, 'idioma': 'es',
            }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(chat.call_args.kwargs['language'], 'es')
        self.assertIn('Cabeça do fêmur', chat.call_args.kwargs['context'])
        self.assertEqual(self.client.post('/api/ia/perguntar/', {
            'pergunta': 'Explique', 'idioma': 'invalid',
        }, format='json').status_code, 400)

    def test_chat_readiness_uses_configured_model_without_inference(self):
        from .views import study_assistant
        name = study_assistant.ollama.config.llm_model
        name = name if ':' in name else f'{name}:latest'
        remote = Mock(json=lambda: {'models': [{'name': name}]})
        with patch('IA_module.ollama_client.requests.get', return_value=remote), patch('IA_module.ollama_client.requests.post') as inference:
            response = self.client.get('/api/ia/status/')
        self.assertEqual(response.data, {'available': True, 'status': 'ready'})
        inference.assert_not_called()
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/ia/status/').status_code, 401)


class ProcessingTaskTests(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.media_override = override_settings(MEDIA_ROOT=self.media.name)
        self.media_override.enable()
        self.addCleanup(self.media_override.disable)
        self.user = User.objects.create_user(username='processor-user')
        self.image = UploadedImage.objects.create(owner=self.user, original_file=uploaded_png(), use_ollama=False)

    def test_processor_persists_png_labels_metadata_and_completion_notification(self):
        response = Mock()
        response.json.return_value = {
            'isProcessed': True, 'id': 'processor-id',
            'processed_image_base64': base64.b64encode(png_bytes()).decode('ascii'),
            'width': 999, 'height': 999,
            'metadata': {'enhancement': {'status': 'disabled'}},
            'rotules': [{'text': 'Fêmur', 'x': 10, 'y': 5, 'confidence': 0.97}],
        }
        with patch('api.tasks.requests.post', return_value=response) as remote:
            result = process_uploaded_image.run(self.image.pk)
        self.image.refresh_from_db()
        self.assertEqual(result['status'], UploadedImage.Status.READY)
        self.assertEqual(remote.call_args.kwargs['data'], {'image_id': str(self.image.pk), 'use_ollama': 'false'})
        self.assertEqual(self.image.processing_metadata['width'], 40)
        self.assertEqual(self.image.processing_metadata['height'], 20)
        self.assertEqual(self.image.processing_metadata['enhancement']['status'], 'disabled')
        self.assertEqual(self.image.annotations.get().text, 'Fêmur')
        self.assertEqual(self.image.annotations.get().normalized_x, 0.25)
        self.assertFalse(self.image.annotations.get().confirmed)
        self.assertEqual(UserNotification.objects.get().user, self.user)
        with self.image.processed_file.open('rb') as saved:
            self.assertEqual(saved.read(), png_bytes())

    def test_invalid_processor_result_marks_failed_with_mysql_safe_notification(self):
        response = Mock()
        response.json.return_value = {'isProcessed': False, 'error': 'x' * 1800}
        with patch('api.tasks.requests.post', return_value=response):
            with self.assertLogs('api.tasks', level='ERROR'):
                result = process_uploaded_image.run(self.image.pk)
        self.image.refresh_from_db()
        self.assertEqual(result['status'], UploadedImage.Status.FAILED)
        self.assertLessEqual(len(UserNotification.objects.get().message), 500)
        self.assertFalse(self.image.processed_file)

    def test_deleted_image_and_completed_delivery_do_not_process_again(self):
        self.image.status = UploadedImage.Status.READY
        self.image.save()
        with patch('api.tasks.requests.post') as remote:
            process_uploaded_image.run(self.image.pk)
            process_uploaded_image.run(999999)
        remote.assert_not_called()
