from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone", "role", "date_joined"]
        read_only_fields = ["id", "role", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "phone", "role"]

    def validate_role(self, value):
        # Prevent self-registering as admin
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Cannot self-register as admin.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
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
