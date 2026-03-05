"""
URL configuration for amt project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from core.auth_views import LoginView, LogoutView, me

urlpatterns = [
    path('admin/', admin.site.urls),
    # Явные auth-маршруты (на случай если core.urls не загружается или другой порядок на сервере)
    path('api/auth/login/', LoginView.as_view(), name='api-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('api/auth/me/', me, name='api-me'),
    path('api/', include('core.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/properties/', include('properties.urls')),
    path('api/contracts/', include('contracts.urls')),
    path('api/accruals/', include('accruals.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/deposits/', include('deposits.urls')),
    path('api/account/', include('account.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/forecast/', include('forecast.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/notifications/', include('notifications.urls')),
]
# Раздаём media в любом режиме (nginx проксирует /media/ на Django)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
