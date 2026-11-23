from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from orders import mpesa
from orders.models import Order, MpesaTransaction
from orders.services import cancel_unpaid_order


class Command(BaseCommand):
    help = (
        "Cancel M-Pesa orders that were never paid and release their reserved stock. "
        "Run every few minutes (cron / systemd timer / scheduler)."
    )

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(minutes=settings.MPESA_ORDER_EXPIRY_MINUTES)
        stale = Order.objects.filter(
            status=Order.Status.PENDING_PAYMENT,
            payment_method=Order.PaymentMethod.MPESA,
            created_at__lt=cutoff,
        )
        cancelled = 0
        for order in stale:
            # Last chance: a prompt may have been paid but the callback never arrived.
            for tx in order.mpesa_transactions.filter(status=MpesaTransaction.Status.PENDING):
                try:
                    mpesa.query_stk_status(tx)
                except mpesa.MpesaError:
                    pass
            order.refresh_from_db()
            if order.status == Order.Status.PENDING_PAYMENT and cancel_unpaid_order(order):
                cancelled += 1
        # Card orders: hosted checkout sessions stay open longer, so allow 4x the M-Pesa window.
        card_cutoff = timezone.now() - timedelta(minutes=settings.MPESA_ORDER_EXPIRY_MINUTES * 4)
        for order in Order.objects.filter(
            status=Order.Status.PENDING_PAYMENT, payment_method=Order.PaymentMethod.CARD, created_at__lt=card_cutoff,
        ):
            from orders import gateways
            gateways.reconcile(order)  # a webhook may have been missed
            order.refresh_from_db()
            if order.status == Order.Status.PENDING_PAYMENT and cancel_unpaid_order(order):
                cancelled += 1
        self.stdout.write(self.style.SUCCESS(f"Cancelled {cancelled} unpaid order(s)."))
