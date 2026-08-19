from rest_framework import generics, permissions
from .models import Currency, Language
from .serializers import CurrencySerializer, LanguageSerializer


class CurrencyListView(generics.ListAPIView):
    """Public list of active currencies with their exchange rate to the base
    currency (KES). Editing a rate in the admin instantly changes every price
    shown storefront-wide in that currency."""

    queryset = Currency.objects.filter(is_active=True)
    serializer_class = CurrencySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class LanguageListView(generics.ListAPIView):
    """Public list of active languages the storefront UI can be switched to."""

    queryset = Language.objects.filter(is_active=True)
    serializer_class = LanguageSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
