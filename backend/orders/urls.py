from django.urls import path
from .views import (
    CheckoutView, MyOrdersView, OrderDetailView, VendorOrderItemsView, VendorOrderItemUpdateView,
    MpesaCallbackView, PaymentStatusView, PayWithMpesaView,
    PayWithCardView, CardVerifyView, StripeWebhookView, PaystackWebhookView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("mine/", MyOrdersView.as_view(), name="my-orders"),
    path("vendor-items/", VendorOrderItemsView.as_view(), name="vendor-order-items"),
    path("vendor-items/<int:pk>/", VendorOrderItemUpdateView.as_view(), name="vendor-order-item-update"),
    path("mpesa/callback/<str:token>/", MpesaCallbackView.as_view(), name="mpesa-callback"),
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("webhooks/paystack/", PaystackWebhookView.as_view(), name="paystack-webhook"),
    path("<str:order_number>/pay/card/", PayWithCardView.as_view(), name="pay-card"),
    path("<str:order_number>/card/verify/", CardVerifyView.as_view(), name="card-verify"),
    path("<str:order_number>/payment-status/", PaymentStatusView.as_view(), name="payment-status"),
    path("<str:order_number>/pay/mpesa/", PayWithMpesaView.as_view(), name="pay-mpesa"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
]
