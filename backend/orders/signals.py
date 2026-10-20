from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Order


@receiver(pre_save, sender=Order)
def notify_on_status_change(sender, instance, **kwargs):
    """Order Tracking: push/email/in-app notification whenever admin/vendor changes status."""
    if not instance.pk or not instance.user_id:
        return
    try:
        previous = Order.objects.get(pk=instance.pk)
    except Order.DoesNotExist:
        return
    if previous.status == instance.status:
        return
    from notifications.utils import notify
    from notifications.models import Notification
    notify(
        instance.user,
        title=f"Order {instance.order_number} is now {instance.get_status_display()}",
        body="Tap to view full order tracking details.",
        category=Notification.Category.ORDER,
        channel=Notification.Channel.IN_APP,
        link=f"/orders/{instance.order_number}",
    )


@receiver(post_save, sender=Order)
def create_delivery_for_new_order(sender, instance, created, **kwargs):
    """Every newly placed order enters dispatch immediately with a trackable timeline."""
    if not created:
        return
    from delivery.models import Delivery
    delivery, was_created = Delivery.objects.get_or_create(
        order=instance,
        defaults={
            "dropoff_label": ", ".join(
                part for part in (instance.shipping_address, instance.shipping_city) if part
            ),
            "dropoff_lat": instance.shipping_lat,
            "dropoff_lng": instance.shipping_lng,
        },
    )
    if was_created:
        delivery.log(
            Delivery.Status.UNASSIGNED,
            note="Order received; waiting for dispatch assignment.",
        )
