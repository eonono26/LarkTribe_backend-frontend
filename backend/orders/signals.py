from django.db.models.signals import pre_save
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
