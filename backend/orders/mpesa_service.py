"""Safaricom Daraja STK Push helpers. Never store Daraja secrets in source control."""
import base64
import os
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

import requests
from django.conf import settings
from django.utils import timezone


class MpesaConfigurationError(Exception):
    pass


class MpesaGatewayError(Exception):
    pass


def normalize_kenyan_phone(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        digits = "254" + digits[1:]
    elif digits.startswith("7") or digits.startswith("1"):
        if len(digits) == 9:
            digits = "254" + digits
    if len(digits) != 12 or not digits.startswith("254"):
        raise ValueError("Enter a valid Kenyan M-Pesa number, e.g. 0712345678.")
    return digits


def _config():
    key = getattr(settings, "MPESA_CONSUMER_KEY", "") or os.getenv("MPESA_CONSUMER_KEY", "")
    secret = getattr(settings, "MPESA_CONSUMER_SECRET", "") or os.getenv("MPESA_CONSUMER_SECRET", "")
    shortcode = getattr(settings, "MPESA_SHORTCODE", "") or os.getenv("MPESA_SHORTCODE", "")
    passkey = getattr(settings, "MPESA_PASSKEY", "") or os.getenv("MPESA_PASSKEY", "")
    callback_url = os.getenv("MPESA_CALLBACK_URL", "")
    env = (getattr(settings, "MPESA_ENV", "sandbox") or "sandbox").lower()
    if not all([key, secret, shortcode, passkey, callback_url]):
        raise MpesaConfigurationError(
            "M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, "
            "MPESA_SHORTCODE, MPESA_PASSKEY and public HTTPS MPESA_CALLBACK_URL."
        )
    if not callback_url.startswith("https://"):
        raise MpesaConfigurationError("MPESA_CALLBACK_URL must be a publicly reachable HTTPS URL.")
    if env not in {"sandbox", "production"}:
        raise MpesaConfigurationError("MPESA_ENV must be sandbox or production.")
    host = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    return key, secret, shortcode, passkey, callback_url, host


def _access_token(key, secret, host):
    try:
        response = requests.get(
            f"{host}/oauth/v1/generate?grant_type=client_credentials",
            auth=(key, secret),
            timeout=15,
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        if not token:
            raise MpesaGatewayError("Safaricom did not return an access token.")
        return token
    except requests.RequestException as exc:
        raise MpesaGatewayError("Could not connect to Safaricom Daraja.") from exc


def initiate_stk_push(order, phone):
    key, secret, shortcode, passkey, callback_url, host = _config()
    phone = normalize_kenyan_phone(phone)
    timestamp = timezone.localtime().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()
    amount = int(Decimal(order.total).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if amount < 1:
        raise ValueError("The payment amount must be at least KES 1.")
    token = _access_token(key, secret, host)
    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": f"LarkTribe-{order.order_number}"[:12],
        "TransactionDesc": f"Order {order.order_number}"[:13],
    }
    try:
        response = requests.post(
            f"{host}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise MpesaGatewayError("Safaricom could not start the payment request. Please retry.") from exc
    if str(data.get("ResponseCode", "")) != "0" or not data.get("CheckoutRequestID"):
        raise MpesaGatewayError(data.get("ResponseDescription") or data.get("errorMessage") or "Safaricom rejected the payment request.")
    return {
        "merchant_request_id": data.get("MerchantRequestID", ""),
        "checkout_request_id": data["CheckoutRequestID"],
        "customer_message": data.get("CustomerMessage", "Check your phone and enter your M-Pesa PIN."),
        "phone": phone,
        "amount": amount,
    }
