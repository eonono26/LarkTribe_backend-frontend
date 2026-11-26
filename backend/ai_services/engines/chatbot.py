"""Store assistant backed by published store guidance and live catalog/order data."""
import re

from .search import smart_search


GREETINGS = {"hi", "hello", "hey", "habari", "mambo"}
ORDER_STATUS_RE = re.compile(r"\b(order|tracking|track|delivery status)\b", re.I)
ORDER_NUMBER_RE = re.compile(r"\b[A-Z0-9]{8,32}\b", re.I)
RETURN_RE = re.compile(r"\b(return|refund|exchange|damaged|wrong item)\b", re.I)

STORE_ANSWERS = (
    (
        re.compile(r"\b(deliver|delivery|shipping|ship|courier|free delivery)\b", re.I),
        "Most Nairobi deliveries arrive in 1–3 business days; upcountry deliveries usually take 3–5 business days. Delivery is free for orders over KES 5,000; otherwise the standard fee is shown at checkout. See /delivery for details.",
    ),
    (
        RETURN_RE,
        "Most items can be returned within 7 days if unused and in their original packaging. Report damaged or incorrect items within 48 hours with photos. Start from Account → Orders and contact Support; see /returns for the full policy.",
    ),
    (
        re.compile(r"\b(payment|pay|m-?pesa|mpesa|visa|mastercard|cash on delivery|card)\b", re.I),
        "Checkout supports M-Pesa, card, and cash on delivery where available. Saved payment methods are managed under Account → Payment. We store only a card brand and last four digits, never your full card number or CVV.",
    ),
    (
        re.compile(r"\b(coupon|promo|discount|voucher|member|5%|code)\b", re.I),
        "You can save available offers under Account → Coupons and enter a valid code at checkout. Signed-in members also receive the member discount when eligible.",
    ),
    (
        re.compile(r"\b(address|profile|account|sign ?in|login|password|wishlist|saved items|notification)\b", re.I),
        "Your profile, order history, saved addresses, payment methods, coupons, wishlist, and notification settings are available from Account. Sign in first, then choose the section you need.",
    ),
    (
        re.compile(r"\b(app|download|mobile|website|site|browse|shop|department|category|brand|size guide)\b", re.I),
        "Browse Baby, Kids, Women, and Men from Shop, or search by product, category, or brand. Product pages show available sizes, colours, stock, and any size guide. The mobile app is available from /download.",
    ),
    (
        re.compile(r"\b(contact|support|help|ticket|talk to|speak to)\b", re.I),
        "For help, open Account → Support to create or reply to a support ticket, or visit /contact. You can also ask me about delivery, returns, payments, products, or an order.",
    ),
    (
        re.compile(r"\b(about|who are you|what is lark ?tribe|company|kenya)\b", re.I),
        "LarkTribe is a Kenya-based fashion shop for Baby, Kids, Women and Men. Read more at /about.",
    ),
)


def _order_answer(order_number, user):
    if not user or not user.is_authenticated:
        return (
            "For privacy, order status is available after you sign in. Open Account → Orders to see your deliveries. If you checked out as a guest, use the order link in your confirmation email or contact /contact.",
            [],
        )

    from orders.models import Order

    order = Order.objects.filter(order_number=order_number, user=user).first()
    if not order:
        return "I couldn't find that order in your account. Check the order number or open Account → Orders to see your purchases.", []

    return (
        f"Order {order.order_number} is currently {order.get_status_display()}. Open /orders/{order.order_number} for the order details and tracking.",
        [],
    )


def answer(message, user=None, awaiting_order_number=False):
    text = message.strip()
    lower = text.lower().strip(" \t\r\n!.?")

    if lower in GREETINGS:
        return "Hi! I can help with products, delivery, returns, payments, account features, or order status. What would you like to know?", []

    if awaiting_order_number:
        order_match = ORDER_NUMBER_RE.fullmatch(text.upper())
        if order_match:
            return _order_answer(order_match.group(), user)
        return "That doesn't look like a valid order number. Please send the order number shown in your confirmation or Account → Orders.", []

    order_match = ORDER_NUMBER_RE.search(text.upper())
    if ORDER_STATUS_RE.search(lower):
        if order_match:
            return _order_answer(order_match.group(), user)
        return "Send your order number and I'll check its latest status. For privacy, you need to be signed in to check an order here.", []

    if RETURN_RE.search(lower):
        return STORE_ANSWERS[1][1], []

    if "ticket" in lower and re.search(r"\b(open|create|make|raise|log)\b", lower):
        return "Okay — describe the issue in one message and I'll log a support ticket for our team.", []

    for pattern, reply in STORE_ANSWERS:
        if pattern.search(lower):
            return reply, []

    products, corrected, was_corrected = smart_search(text, limit=6)
    if products:
        prefix = f"I searched for “{corrected}”. " if was_corrected else ""
        return f"{prefix}Here are some matching products. You can open a product to see its price, sizes, colours, and availability.", products

    return (
        "I don't have a reliable answer for that yet. I can help with products, orders, delivery, returns, payments, coupons, and account features. For anything else, visit /faq or contact /contact.",
        [],
    )
