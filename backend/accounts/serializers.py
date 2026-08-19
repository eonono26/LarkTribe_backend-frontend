from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Address, PaymentMethod

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone", "role", "date_joined", "preferred_currency", "preferred_language", "profile_picture", "profile_picture_url"]
        read_only_fields = ["id", "role", "date_joined", "profile_picture_url"]

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "phone", "role", "profile_picture"]

    def validate_role(self, value):
        # Prevent self-registering as admin
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Cannot self-register as admin.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        profile_picture = validated_data.pop("profile_picture", None)
        user = User(**validated_data)
        user.set_password(password)
        if profile_picture:
            user.profile_picture = profile_picture
        user.save()
        return user


class SocialAuthSerializer(serializers.Serializer):
    """Google/Apple sign-in: client sends the provider ID token, we verify it
    (see accounts/social_auth.py) and issue our own JWT pair like normal login."""
    provider = serializers.ChoiceField(choices=["google", "apple"])
    id_token = serializers.CharField()


class PhoneOTPRequestSerializer(serializers.Serializer):
    """Registration & Login by phone: request a one-time code."""
    phone = serializers.CharField(max_length=20)


class PhoneOTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)
    code = serializers.CharField(max_length=6)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "label", "full_name", "phone", "address_line", "city", "is_default", "created_at"]
        read_only_fields = ["id", "created_at"]


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            "id", "type", "label", "card_brand", "card_last4", "card_exp_month", "card_exp_year",
            "mpesa_phone", "is_default", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        method_type = attrs.get("type", getattr(self.instance, "type", None))
        if method_type == PaymentMethod.Type.CARD:
            missing = [f for f in ("card_brand", "card_last4") if not attrs.get(f, getattr(self.instance, f, ""))]
            if missing:
                raise serializers.ValidationError("Card brand and last 4 digits are required for a card.")
        elif method_type == PaymentMethod.Type.MPESA:
            if not attrs.get("mpesa_phone", getattr(self.instance, "mpesa_phone", "")):
                raise serializers.ValidationError("An M-Pesa phone number is required.")
        return attrs