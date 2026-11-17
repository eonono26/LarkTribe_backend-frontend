from django.db import transaction

from catalog.models import Product, ProductVariant
from .models import Order


@transaction.atomic
def cancel_unpaid_order(order: Order, reason: str = "") -> bool:
    """Cancel a still-unpaid order and put its reserved stock back on the shelf."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    if order.status != Order.Status.PENDING_PAYMENT:
        return False
    for item in order.items.select_related("variant", "product"):
        if item.variant_id:
            inv = ProductVariant.objects.select_for_update().get(pk=item.variant_id)
        else:
            inv = Product.objects.select_for_update().get(pk=item.product_id)
        inv.stock += item.quantity
        inv.save(update_fields=["stock"])
        item.fulfillment_status = item.FulfillmentStatus.CANCELLED
        item.save(update_fields=["fulfillment_status"])
    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])
    return True
