from rest_framework import serializers
from .models import Currency, Language


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["code", "name", "symbol", "rate_to_base", "is_base", "is_default"]


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ["code", "name", "native_name", "flag", "is_default"]
