from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccrualViewSet

router = DefaultRouter()
router.register(r'', AccrualViewSet, basename='accrual')

urlpatterns = [
    path('', include(router.urls)),
]
