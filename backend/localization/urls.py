from django.urls import path
from .views import CurrencyListView, LanguageListView

urlpatterns = [
    path("currencies/", CurrencyListView.as_view(), name="currency-list"),
    path("languages/", LanguageListView.as_view(), name="language-list"),
]
