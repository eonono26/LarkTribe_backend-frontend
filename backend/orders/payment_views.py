import json
import hmac
import os
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status, views
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import Order
from .mpesa_service import (
    MpesaConfigurationError, MpesaGatewayError, initiate_stk_push, normalize_kenyan_phone,
)


class MpesaInitiateView(views.APIView):
    """Start an STK Push for an existing order. Guest orders require the delivery phone."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.is_authenticated and order.user_id and order.user_id != request.user.id:
            return Response({"detail": "You cannot pay for this order."}, status=status.HTTP_403_FORBIDDEN)
        if order.payment_method != Order.PaymentMethod.MPESA:
            return Response({"detail": "This order is not configured for M-Pesa."}, status=status.HTTP_400_BAD_REQUEST)
        if order.status == Order.Status.PAID or order.mpesa_receipt:
            return Response({"detail": "This order is already paid."}, status=status.HTTP_409_CONFLICT)
        if order.status in {Order.Status.CANCELLED, Order.Status.REFUNDED}:
            return Response({"detail": "This order cannot be paid."}, status=status.HTTP_409_CONFLICT)

        supplied_phone = request.data.get("phone") or order.shipping_phone
        try:
            normalized = normalize_kenyan_phone(supplied_phone)
            saved_phone = normalize_kenyan_phone(order.shipping_phone)
        except ValueError as exc:
            raise ValidationError({"phone": str(exc)})
        if normalized != saved_phone:
            raise ValidationError({"phone": "Use the phone number provided for delivery, or update your delivery details before checkout."})

        try:
            result = initiate_stk_push(order, normalized)
        except MpesaConfigurationError as exc:
            return Response({"detail": str(exc), "code": "mpesa_not_configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (MpesaGatewayError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        order.mpesa_merchant_request_id = result["merchant_request_id"]
        order.mpesa_checkout_request_id = result["checkout_request_id"]
        order.mpesa_phone = result["phone"]
        order.mpesa_result_desc = "STK Push sent; awaiting customer confirmation."
        order.save(update_fields=[
            "mpesa_merchant_request_id", "mpesa_checkout_request_id",
            "mpesa_phone", "mpesa_result_desc", "updated_at",
        ])
        return Response({
            "order_number": order.order_number,
            "payment_status": "pending",
            "checkout_request_id": result["checkout_request_id"],
            "amount": result["amount"],
            "phone": result["phone"],
            "message": result["customer_message"],
        }, status=status.HTTP_202_ACCEPTED)


@method_decorator(csrf_exempt, name="dispatch")
class MpesaCallbackView(views.APIView):
    """Safaricom asynchronous callback. Idempotently updates the order from the matching CheckoutRequestID."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        expected_token = os.getenv("MPESA_CALLBACK_TOKEN", "")
        supplied_token = request.query_params.get("token", "")
        if not expected_token or not hmac.compare_digest(expected_token, supplied_token):
            return Response({"detail": "Invalid callback token."}, status=status.HTTP_403_FORBIDDEN)
        body = request.data if isinstance(request.data, dict) else {}
        callback = body.get("Body", {}).get("stkCallback", {})
        checkout_id = callback.get("CheckoutRequestID")
        if not checkout_id:
            return Response({"ResultCode": 0, "ResultDesc": "Callback received."})

        with transaction.atomic():
            order = Order.objects.select_for_update().filter(mpesa_checkout_request_id=checkout_id).first()
            if not order:
                # Acknowledge unknown/late callbacks so Safaricom does not retry forever.
                return Response({"ResultCode": 0, "ResultDesc": "Callback acknowledged."})

            if order.status == Order.Status.PAID and order.mpesa_receipt:
                return Response({"ResultCode": 0, "ResultDesc": "Payment already recorded."})

            result_code = str(callback.get("ResultCode", ""))
            result_desc = str(callback.get("ResultDesc", ""))[:255]
            order.mpesa_result_desc = result_desc
            fields = ["mpesa_result_desc", "updated_at"]

            if result_code == "0":
                metadata = callback.get("CallbackMetadata", {}).get("Item", [])
                items = {item.get("Name"): item.get("Value") for item in metadata if isinstance(item, dict)}
                receipt = str(items.get("MpesaReceiptNumber") or "")[:64]
                try:
                    paid_amount = Decimal(str(items.get("Amount")))
                except Exception:
                    paid_amount = Decimal("0")
                expected_amount = Decimal(order.total).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
                if not receipt or paid_amount != expected_amount:
                    order.mpesa_result_desc = "Payment callback did not match expected receipt/amount; requires review."
                    order.save(update_fields=fields)
                    return Response({"ResultCode": 0, "ResultDesc": "Callback acknowledged for review."})
                order.mpesa_receipt = receipt
                order.status = Order.Status.PAID
                fields.extend(["mpesa_receipt", "status"])
            order.save(update_fields=list(set(fields)))
        return Response({"ResultCode": 0, "ResultDesc": "Callback processed."})
