"""Rule-based AI shopping assistant.

Classifies simple intents (search, order status, returns, greeting, help) and
answers using live catalog/order data. The function signature is intentionally
provider-agnostic: swap `answer()`'s body for a call to an LLM (e.g. the
Anthropic API — see this project's own AI-in-artifacts pattern) without
changing the ChatSession/ChatMessage models or the view that calls it.
"""
import re
from .search import smart_search

GREETINGS = {"hi", "hello", "hey", "habari", "mambo"}
ORDER_STATUS_RE = re.compile(r"\b(order|tracking|track)\b", re.I)
RETURN_RE = re.compile(r"\b(return|refund|exchange)\b", re.I)
HELP_RE = re.compile(r"\b(help|support)\b", re.I)


def answer(message, user=None):
    text = message.strip()
    lower = text.lower()

    if lower in GREETINGS or lower.rstrip("!.") in GREETINGS:
        return "Hi! I can help you find products, track an order, or start a return. What do you need?", []

    order_match = re.search(r"[A-Z0-9]{8,10}", text.upper())
    if ORDER_STATUS_RE.search(lower) and order_match:
        from orders.models import Order
        try:
            order = Order.objects.get(order_number=order_match.group())
            return f"Order {order.order_number} is currently '{order.get_status_display()}'.", []
        except Order.DoesNotExist:
            return "I couldn't find an order with that number — please double-check it.", []

    if ORDER_STATUS_RE.search(lower):
        return "Sure — what's your order number? You'll find it in your confirmation email or the Orders page.", []

    if RETURN_RE.search(lower):
        return (
            "You can start a return from Orders > select the item > Return/Refund, "
            "or I can open a support ticket for you — just say 'open a ticket'.",
            [],
        )

    if "ticket" in lower:
        return "Okay — describe the issue in one message and I'll log a support ticket for our team.", []

    if HELP_RE.search(lower):
        return "I can search products, check order status, or help with returns. Try: 'show me maternity dresses'.", []

    products, corrected, was_corrected = smart_search(text, limit=6)
    if products:
        names = ", ".join(p.name for p in products[:5])
        prefix = f"(showing results for '{corrected}') " if was_corrected else ""
        return f"{prefix}Here's what I found: {names}.", products

    return "I couldn't find a match for that — try different keywords, or ask me to check an order.", []
