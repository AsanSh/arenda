from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, ExchangeRateViewSet, RequestViewSet, EmployeesViewSet, AuditLogViewSet
from .auth_views import me, profile_update, change_password, check_phone, login_whatsapp, LoginView, LogoutView
from .whatsapp_auth_views import whatsapp_start, whatsapp_status, greenapi_webhook, whatsapp_request_code, whatsapp_verify_code

router = DefaultRouter()
router.register(r'tenants', TenantViewSet, basename='tenant')
router.register(r'exchange-rates', ExchangeRateViewSet, basename='exchange-rate')
router.register(r'requests', RequestViewSet, basename='request')
router.register(r'settings/employees', EmployeesViewSet, basename='employees')
router.register(r'settings/audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', me, name='me'),
    path('auth/profile/', profile_update, name='profile-update'),
    path('auth/change-password/', change_password, name='change-password'),
    path('auth/check-phone/', check_phone, name='check-phone'),
    path('auth/login-whatsapp/', login_whatsapp, name='login-whatsapp'),  # Старый endpoint (deprecated)
    # Новые endpoints для правильной архитектуры
    path('auth/whatsapp/start/', whatsapp_start, name='whatsapp-start'),
    path('auth/whatsapp/status/', whatsapp_status, name='whatsapp-status'),
    path('auth/whatsapp/request-code/', csrf_exempt(whatsapp_request_code), name='whatsapp-request-code'),
    path('auth/whatsapp/verify-code/', csrf_exempt(whatsapp_verify_code), name='whatsapp-verify-code'),
    path('webhooks/greenapi/incoming/', greenapi_webhook, name='greenapi-webhook'),
    path('', include(router.urls)),
]
