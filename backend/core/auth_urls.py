from django.urls import path
from . import auth_views

urlpatterns = [
    path('login/', auth_views.LoginView.as_view()),
    path('me/', auth_views.MeView.as_view()),
    path('logout/', auth_views.LogoutView.as_view()),
    path('whatsapp/verify-phone/', auth_views.WhatsAppVerifyPhoneView.as_view()),
    path('whatsapp/request-code/', auth_views.WhatsAppRequestCodeView.as_view()),
]
