from django.urls import path
from .views import CheckoutView, MyOrdersView, OrderDetailView, VendorOrderItemsView, VendorOrderItemUpdateView
from .payment_views import MpesaInitiateView, MpesaCallbackView

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("mpesa/initiate/<str:order_number>/", MpesaInitiateView.as_view(), name="mpesa-initiate"),
    path("mpesa/callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
    path("mine/", MyOrdersView.as_view(), name="my-orders"),
    path("vendor-items/", VendorOrderItemsView.as_view(), name="vendor-order-items"),
    path("vendor-items/<int:pk>/", VendorOrderItemUpdateView.as_view(), name="vendor-order-item-update"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
]
