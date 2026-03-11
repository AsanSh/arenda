from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PropertyAnalyticsViewSet

router = DefaultRouter()
router.register(r'properties', PropertyAnalyticsViewSet, basename='analytics-properties')

urlpatterns = [
    path('', include(router.urls)),
]
