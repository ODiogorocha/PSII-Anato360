from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from pathlib import Path
from api.views import AIQueryView, UploadPDFView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/ai/perguntar', AIQueryView.as_view(), name='ai-perguntar'),
    path('api/ia/upload-pdf/', UploadPDFView.as_view(), name='ia-upload-pdf'),
]

# User uploads are always served by authenticated API views, including in DEBUG.
if settings.DEBUG:
    for public_directory in ('pecas_360', 'pecas_3d'):
        urlpatterns += static(
            f'/media/{public_directory}/',
            document_root=Path(settings.MEDIA_ROOT) / public_directory,
        )
