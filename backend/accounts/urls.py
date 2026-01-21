from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountViewSet, AccountTransactionViewSet

router = DefaultRouter()
router.register(r'', AccountViewSet, basename='account')
router.register(r'transactions', AccountTransactionViewSet, basename='account-transaction')

urlpatterns = [
    path('', include(router.urls)),
]
