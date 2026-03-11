from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvestorDashboardViewSet

router = DefaultRouter()
router.register(r'dashboard', InvestorDashboardViewSet, basename='investor-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
