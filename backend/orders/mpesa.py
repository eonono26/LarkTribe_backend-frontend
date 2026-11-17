"""
M-Pesa Daraja integration (STK Push / Lipa Na M-Pesa Online) for Till payments.

Flow
----
1. Checkout creates the Order (pending_payment) and calls `initiate_stk_push()`.
2. The customer gets a PIN prompt on their phone.
3. Safaricom POSTs the result to our callback URL  -> `apply_stk_result()`.
   If the callback can't reach us (e.g. localhost), the order page polls
   `payment-status/`, which falls back to the STK Push Query API -> same function.
4. `apply_stk_result()` is idempotent: it moves the Order to PAID exactly once.
"""
import base64
import logging
import re
import time
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

import requests
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

NAIROBI = ZoneInfo("Africa/Nairobi")
TIMEOUT = 25  # seconds for calls to Daraja

# STK Query / callback result codes worth naming
RESULT_SUCCESS = 0
RESULT_CANCELLED = 1032      # customer dismissed the prompt
RESULT_TIMEOUT = 1037        # prompt expired, no PIN entered
RESULT_INSUFFICIENT = 1      # insufficient M-Pesa balance
RESULT_WRONG_PIN = 2001


class MpesaError(Exception):
    """Raised for configuration problems or Daraja rejections; message is user-safe."""


def _base_url() -> str:
    if getattr(settings, "MPESA_BASE_URL", ""):  # override, e.g. a local mock for tests
        return settings.MPESA_BASE_URL.rstrip("/")
    return (
        "https://api.safaricom.co.ke"
        if settings.MPESA_ENV == "production"
        else "https://sandbox.safaricom.co.ke"
    )


def is_configured() -> bool:
    return all([
        settings.MPESA_CONSUMER_KEY,
        settings.MPESA_CONSUMER_SECRET,
        settings.MPESA_SHORTCODE,
        settings.MPESA_PASSKEY,
        settings.MPESA_CALLBACK_BASE_URL,
    ])


def normalize_phone(raw: str) -> str:
    """Kenyan number -> 2547XXXXXXXX / 2541XXXXXXXX, the only format Daraja accepts."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("254") and len(digits) == 12:
        pass
    elif digits.startswith("0") and len(digits) == 10:
        digits = "254" + digits[1:]
    elif len(digits) == 9 and digits[0] in "71":
        digits = "254" + digits
    else:
        raise MpesaError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    if digits[3] not in "71":
        raise MpesaError("Enter a valid Safaricom number, e.g. 0712 345 678.")
    return digits


def whole_amount(total) -> int:
    """Daraja only accepts whole shillings."""
    return int(Decimal(total).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


_token_cache = {"value": None, "expires": 0.0}


def _access_token() -> str:
    if _token_cache["value"] and time.time() < _token_cache["expires"] - 30:
        return _token_cache["value"]
    try:
        res = requests.get(
            f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials",
            auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
            timeout=TIMEOUT,
        )
        res.raise_for_status()
        data = res.json()
    except (requests.RequestException, ValueError) as exc:
        logger.error("M-Pesa auth failed: %s", exc)
        raise MpesaError("Could not reach M-Pesa. Please try again in a moment.")
    _token_cache["value"] = data["access_token"]
    _token_cache["expires"] = time.time() + int(data.get("expires_in", 3599))
    return _token_cache["value"]


def _password(timestamp: str) -> str:
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode()).decode()


def _timestamp() -> str:
    return datetime.now(NAIROBI).strftime("%Y%m%d%H%M%S")


def callback_url() -> str:
    base = settings.MPESA_CALLBACK_BASE_URL.rstrip("/")
    return f"{base}/api/orders/mpesa/callback/{settings.MPESA_CALLBACK_TOKEN}/"


def _post(path: str, payload: dict) -> dict:
    try:
        res = requests.post(
            f"{_base_url()}{path}",
            json=payload,
            headers={"Authorization": f"Bearer {_access_token()}"},
            timeout=TIMEOUT,
        )
        try:
            data = res.json()
        except ValueError:
            data = {}
    except requests.RequestException as exc:
        logger.error("M-Pesa request to %s failed: %s", path, exc)
        raise MpesaError("Could not reach M-Pesa. Please try again in a moment.")
    return data


def initiate_stk_push(order, phone: str):
    """Send the PIN prompt and record a pending MpesaTransaction. Returns it."""
    from .models import MpesaTransaction

    if not is_configured():
        raise MpesaError("M-Pesa is not configured on the server yet.")

    phone = normalize_phone(phone)
    amount = whole_amount(order.total)
    if amount < 1:
        raise MpesaError("Order total is too small to charge.")

    ts = _timestamp()
    data = _post("/mpesa/stkpush/v1/processrequest", {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": _password(ts),
        "Timestamp": ts,
        "TransactionType": settings.MPESA_TRANSACTION_TYPE,
        "Amount": amount,
        "PartyA": phone,
        "PartyB": settings.MPESA_TILL_NUMBER or settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": callback_url(),
        "AccountReference": order.order_number[:12],
        "TransactionDesc": "Larktribe",
    })

    if str(data.get("ResponseCode")) != "0" or not data.get("CheckoutRequestID"):
        logger.error("STK push rejected for %s: %s", order.order_number, data)
        raise MpesaError(
            data.get("errorMessage") or data.get("CustomerMessage")
            or "M-Pesa could not start the payment. Please try again."
        )

    return MpesaTransaction.objects.create(
        order=order,
        phone=phone,
        amount=amount,
        merchant_request_id=data.get("MerchantRequestID", ""),
        checkout_request_id=data["CheckoutRequestID"],
    )


def query_stk_status(tx):
    """
    Ask Daraja what happened to a pending prompt (fallback when the callback is
    delayed or unreachable). Returns True if the transaction was resolved.
    """
    if tx.status != tx.Status.PENDING or not is_configured():
        return False
    ts = _timestamp()
    data = _post("/mpesa/stkpushquery/v1/query", {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": _password(ts),
        "Timestamp": ts,
        "CheckoutRequestID": tx.checkout_request_id,
    })
    # While the customer is still deciding Daraja answers with an errorCode
    # ("The transaction is being processed") and no ResultCode.
    if "ResultCode" not in data:
        return False
    return apply_stk_result(
        tx.checkout_request_id,
        int(data["ResultCode"]),
        data.get("ResultDesc", ""),
        source="query",
    )


@transaction.atomic
def apply_stk_result(checkout_request_id, result_code, result_desc, receipt="", amount=None, raw=None, source="callback"):
    """
    Record the outcome of an STK push exactly once and update the Order.
    Safe to call repeatedly (Safaricom retries; the poller also calls it).
    Returns True if this call changed anything.
    """
    from .models import MpesaTransaction, Order

    try:
        tx = (
            MpesaTransaction.objects.select_for_update()
            .select_related("order")
            .get(checkout_request_id=checkout_request_id)
        )
    except MpesaTransaction.DoesNotExist:
        logger.warning("M-Pesa result for unknown CheckoutRequestID %s", checkout_request_id)
        return False

    order = Order.objects.select_for_update().get(pk=tx.order_id)

    # A late callback may carry the receipt number that the query fallback lacked.
    if tx.status == tx.Status.SUCCESS:
        if receipt and not tx.receipt:
            tx.receipt = receipt
            tx.save(update_fields=["receipt", "updated_at"])
            if not order.mpesa_receipt:
                order.mpesa_receipt = receipt
                order.save(update_fields=["mpesa_receipt", "updated_at"])
            return True
        return False
    if tx.status != tx.Status.PENDING:
        return False

    tx.result_code = result_code
    tx.result_desc = (result_desc or "")[:255]
    if raw is not None:
        tx.raw_callback = raw

    if result_code == RESULT_SUCCESS:
        # Never trust a payment smaller than the order total.
        if amount is not None and Decimal(str(amount)) < Decimal(whole_amount(order.total)):
            logger.error(
                "M-Pesa amount mismatch on %s: paid %s, expected %s",
                order.order_number, amount, order.total,
            )
            tx.status = tx.Status.REVIEW
            tx.result_desc = f"AMOUNT MISMATCH: paid {amount}, expected {whole_amount(order.total)}"[:255]
            tx.receipt = receipt
            tx.save()
            return True

        tx.status = tx.Status.SUCCESS
        tx.receipt = receipt
        tx.save()

        if order.status == Order.Status.PENDING_PAYMENT:
            order.status = Order.Status.PAID
            order.mpesa_receipt = receipt
            order.save(update_fields=["status", "mpesa_receipt", "updated_at"])  # signal notifies the shopper
        elif order.status != Order.Status.CANCELLED:
            # Order was already paid by another attempt: the customer paid twice.
            logger.error("Duplicate M-Pesa payment %s for order %s", receipt, order.order_number)
            tx.status = tx.Status.REVIEW
            tx.result_desc = "Duplicate payment - refund the customer."
            tx.save(update_fields=["status", "result_desc", "updated_at"])
        else:
            # Paid after we expired/cancelled it: needs a manual refund or reinstatement.
            logger.error("M-Pesa payment %s received for CANCELLED order %s", receipt, order.order_number)
            tx.status = tx.Status.REVIEW
            tx.result_desc = "Paid after order was cancelled - refund or reinstate."
            tx.save(update_fields=["status", "result_desc", "updated_at"])
        return True

    tx.status = tx.Status.CANCELLED if result_code == RESULT_CANCELLED else tx.Status.FAILED
    tx.save()
    return True


def friendly_failure(result_code, result_desc="") -> str:
    return {
        RESULT_CANCELLED: "You cancelled the M-Pesa prompt.",
        RESULT_TIMEOUT: "The M-Pesa prompt timed out before a PIN was entered.",
        RESULT_INSUFFICIENT: "Your M-Pesa balance is too low for this order.",
        RESULT_WRONG_PIN: "The M-Pesa PIN was incorrect.",
    }.get(result_code, result_desc or "The M-Pesa payment did not go through.")
