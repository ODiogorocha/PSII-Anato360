from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from api.views import AIQueryView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/ia/perguntar/', AIQueryView.as_view(), name='ia-perguntar'),
    path('api/ai/perguntar', AIQueryView.as_view(), name='ai-perguntar'),
    path('api/ia/upload-pdf/', UploadPDFView.as_view(), name='ia-upload-pdf'),
]

# Servir arquivos de mídia (imagens das peças) em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)