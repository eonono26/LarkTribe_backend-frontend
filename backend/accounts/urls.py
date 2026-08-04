from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, MeView, LoginView, SocialAuthView,
    PhoneOTPRequestView, PhoneOTPVerifyView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("social/", SocialAuthView.as_view(), name="social-auth"),
    path("phone/request-otp/", PhoneOTPRequestView.as_view(), name="phone-otp-request"),
    path("phone/verify-otp/", PhoneOTPVerifyView.as_view(), name="phone-otp-verify"),
]
