from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework import generics, permissions, views, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, UserSerializer, SocialAuthSerializer,
    PhoneOTPRequestSerializer, PhoneOTPVerifySerializer,
    AddressSerializer, PaymentMethodSerializer,
)
from .models import PhoneOTP, Address, PaymentMethod
from .social_auth import verify_provider_token, SocialAuthError

User = get_user_model()


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        """Handle profile picture updates with proper file handling"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}
        
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        # Handle profile picture separately if needed
        if 'profile_picture' in self.request.FILES:
            serializer.save(profile_picture=self.request.FILES['profile_picture'])
        else:
            serializer.save()


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]



class SocialAuthView(views.APIView):
    """Registration & Login via Google or Apple: verifies the provider's id_token,
    finds-or-creates the local account, and returns our own JWT pair."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SocialAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data["provider"]
        try:
            info = verify_provider_token(provider, serializer.validated_data["id_token"])
        except SocialAuthError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        sub_field = f"{provider}_sub"
        user = User.objects.filter(**{sub_field: info["sub"]}).first()
        if not user and info.get("email"):
            user = User.objects.filter(email=info["email"]).first()
            if user:
                setattr(user, sub_field, info["sub"])
                user.save(update_fields=[sub_field])
        if not user:
            username = f"{provider}_{get_random_string(10)}"
            user = User.objects.create(
                username=username, email=info.get("email", ""),
                first_name=info.get("first_name", ""), last_name=info.get("last_name", ""),
                **{sub_field: info["sub"]},
            )
            user.set_unusable_password()
            user.save()

        return Response({"user": UserSerializer(user, context={'request': request}).data, **_tokens_for(user)})


class PhoneOTPRequestView(views.APIView):
    """Registration & Login by phone, step 1: issue a one-time code.
    Wire an SMS gateway (e.g. Africa's Talking) into `_send_sms` for production;
    in DEBUG the code is echoed back in the response for easy local testing."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.conf import settings
        serializer = PhoneOTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        otp = PhoneOTP.issue(phone)
        _send_sms(phone, f"Your duka verification code is {otp.code}")
        payload = {"detail": "Verification code sent."}
        if settings.DEBUG:
            payload["debug_code"] = otp.code
        return Response(payload)


class PhoneOTPVerifyView(views.APIView):
    """Registration & Login by phone, step 2: verify the code, find-or-create the
    account, and return a JWT pair."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PhoneOTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        code = serializer.validated_data["code"]

        otp = PhoneOTP.objects.filter(phone=phone, code=code, consumed=False).order_by("-created_at").first()
        if not otp or not otp.is_valid():
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)
        otp.consumed = True
        otp.save(update_fields=["consumed"])

        user = User.objects.filter(phone=phone).first()
        if not user:
            username = f"user_{get_random_string(10)}"
            user = User.objects.create(username=username, phone=phone, is_phone_verified=True)
            user.set_unusable_password()
            user.save()
        elif not user.is_phone_verified:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        return Response({"user": UserSerializer(user, context={'request': request}).data, **_tokens_for(user)})


def _send_sms(phone, message):
    """TODO: integrate an SMS gateway (e.g. Africa's Talking, Twilio). No-op today."""
    return None


class AddressViewSet(viewsets.ModelViewSet):
    """Saved delivery addresses — the account 'Address Book', selectable at checkout."""
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        address = self.get_object()
        address.is_default = True
        address.save(update_fields=["is_default"])
        return Response(AddressSerializer(address).data)


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """Saved payment methods — cards (display-only token, never a real PAN) and M-Pesa numbers."""
    serializer_class = PaymentMethodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        method = self.get_object()
        method.is_default = True
        method.save(update_fields=["is_default"])
        return Response(PaymentMethodSerializer(method).data)


# Optional: Add a dedicated view for profile picture upload/delete
class ProfilePictureView(views.APIView):
    """Dedicated endpoint for uploading or deleting profile pictures"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Upload a profile picture"""
        if 'profile_picture' not in request.FILES:
            return Response(
                {"detail": "No profile picture provided."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        user.profile_picture = request.FILES['profile_picture']
        user.save(update_fields=['profile_picture'])
        
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    def delete(self, request):
        """Delete the profile picture"""
        user = request.user
        if user.profile_picture:
            # Delete the file from storage
            user.profile_picture.delete(save=False)
            user.profile_picture = None
            user.save(update_fields=['profile_picture'])
        
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)