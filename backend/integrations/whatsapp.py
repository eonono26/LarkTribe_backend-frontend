"""WhatsApp Business Cloud API: order updates. No-ops (returns False) when not configured."""
import logging
import re
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _digits(phone: str) -> str:
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("0") and len(d) == 10:
        d = "254" + d[1:]
    elif d.startswith("7") and len(d) == 9 or d.startswith("1") and len(d) == 9:
        d = "254" + d
    return d


def configured():
    return bool(settings.WHATSAPP_CLOUD_TOKEN and settings.WHATSAPP_PHONE_NUMBER_ID)


def send_order_update(order, status_text):
    if not configured():
        return False
    to = _digits(order.shipping_phone)
    if len(to) < 11:
        return False
    if settings.WHATSAPP_TEMPLATE_NAME:
        payload = {"messaging_product": "whatsapp", "to": to, "type": "template", "template": {
            "name": settings.WHATSAPP_TEMPLATE_NAME, "language": {"code": settings.WHATSAPP_TEMPLATE_LANG},
            "components": [{"type": "body", "parameters": [
                {"type": "text", "text": order.order_number}, {"type": "text", "text": status_text}]}]}}
    else:
        payload = {"messaging_product": "whatsapp", "to": to, "type": "text",
                   "text": {"body": f"LarkTribe: your order {order.order_number} is now {status_text}."}}
    try:
        r = requests.post(
            f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages",
            headers={"Authorization": f"Bearer {settings.WHATSAPP_CLOUD_TOKEN}"}, json=payload, timeout=10)
        if r.status_code >= 300:
            logger.warning("WhatsApp send failed %s: %s", r.status_code, r.text[:200])
            return False
        return True
    except requests.RequestException:
        logger.exception("WhatsApp send error")
        return False
