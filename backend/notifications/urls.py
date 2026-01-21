from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationSettingsViewSet, NotificationLogViewSet

router = DefaultRouter()
router.register(r'settings', NotificationSettingsViewSet, basename='notification-settings')
router.register(r'logs', NotificationLogViewSet, basename='notification-logs')

urlpatterns = [
    path('', include(router.urls)),
]
