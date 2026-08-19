from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, views, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied

from orders.models import Order
from .models import Driver, Delivery
from .permissions import IsDriver, IsAdminUser
from .serializers import (
    DriverMeSerializer, DriverAdminSerializer, DeliveryTrackingSerializer,
    DeliveryAdminSerializer, AssignDriverSerializer,
)


# ---------------------------------------------------------------- customer --

class OrderTrackingView(generics.RetrieveAPIView):
    """Public tracking screen data for one order — status, driver position, timeline.
    Mirrors OrderDetailView's public-by-order-number lookup already used for order status."""
    serializer_class = DeliveryTrackingSerializer
    permission_classes = [permissions.AllowAny]
    lookup_url_kwarg = "order_number"

    def get_object(self):
        order = get_object_or_404(Order, order_number=self.kwargs["order_number"])
        delivery, _ = Delivery.objects.get_or_create(
            order=order,
            defaults={"dropoff_label": f"{order.shipping_address}, {order.shipping_city}",
                      "dropoff_lat": order.shipping_lat, "dropoff_lng": order.shipping_lng},
        )
        return delivery


# ------------------------------------------------------------------ driver --

class DriverMeView(generics.RetrieveUpdateAPIView):
    """A driver's own profile: toggle online/offline and post live location.
    Frontend should PATCH {is_online, current_lat, current_lng} every few seconds while online."""
    serializer_class = DriverMeSerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_object(self):
        return self.request.user.driver_profile

    def perform_update(self, serializer):
        if "current_lat" in serializer.validated_data or "current_lng" in serializer.validated_data:
            serializer.save(last_location_at=timezone.now())
        else:
            serializer.save()


class DriverDeliveriesView(generics.ListAPIView):
    """?scope=available (unassigned jobs, for the driver to accept) or
    ?scope=mine (default — jobs currently assigned to this driver, in progress)."""
    serializer_class = DeliveryAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    def get_queryset(self):
        driver = self.request.user.driver_profile
        scope = self.request.query_params.get("scope", "mine")
        if scope == "available":
            return Delivery.objects.filter(status=Delivery.Status.UNASSIGNED).order_by("created_at")
        return Delivery.objects.filter(driver=driver).exclude(
            status__in=[Delivery.Status.DELIVERED, Delivery.Status.CANCELLED, Delivery.Status.FAILED]
        ).order_by("-created_at")


class DriverDeliveryActionView(views.APIView):
    """POST /driver/deliveries/<id>/<action>/ where action is accept|pickup|deliver|cancel."""
    permission_classes = [permissions.IsAuthenticated, IsDriver]

    TRANSITIONS = {
        "accept": (Delivery.Status.UNASSIGNED, Delivery.Status.ASSIGNED),
        "pickup": (Delivery.Status.ASSIGNED, Delivery.Status.PICKED_UP),
        "en_route": (Delivery.Status.PICKED_UP, Delivery.Status.EN_ROUTE),
        "deliver": (Delivery.Status.EN_ROUTE, Delivery.Status.DELIVERED),
        "cancel": (None, Delivery.Status.CANCELLED),
    }

    def post(self, request, pk, action):
        if action not in self.TRANSITIONS:
            raise ValidationError(f"Unknown action '{action}'.")
        delivery = get_object_or_404(Delivery, pk=pk)
        driver = request.user.driver_profile
        required_from, new_status = self.TRANSITIONS[action]

        if action == "accept":
            if delivery.status != Delivery.Status.UNASSIGNED:
                raise ValidationError("This delivery has already been taken.")
            delivery.driver = driver
            delivery.save(update_fields=["driver"])
        else:
            if delivery.driver_id != driver.id:
                raise PermissionDenied("This delivery isn't assigned to you.")
            if required_from and delivery.status != required_from:
                raise ValidationError(f"Delivery must be '{required_from}' to {action}, currently '{delivery.status}'.")

        delivery.transition(new_status, note=f"Driver {action}")

        # Reflect on the order itself so the customer's existing order-status view stays in sync.
        order = delivery.order
        if new_status == Delivery.Status.PICKED_UP:
            order.status = Order.Status.SHIPPED
            order.save(update_fields=["status"])
        elif new_status == Delivery.Status.DELIVERED:
            order.status = Order.Status.DELIVERED
            order.save(update_fields=["status"])
            if order.user_id:
                from notifications.utils import notify
                from notifications.models import Notification
                notify(
                    order.user, title=f"Order {order.order_number} delivered",
                    body="Your order has arrived. Enjoy!",
                    category=Notification.Category.ORDER, channel=Notification.Channel.IN_APP,
                    link=f"/orders/{order.order_number}",
                )

        return Response(DeliveryAdminSerializer(delivery).data)


# ------------------------------------------------------------------- admin --

class AdminDriverViewSet(viewsets.ModelViewSet):
    """Admin manages driver accounts: approve, deactivate, review live status."""
    queryset = Driver.objects.select_related("user").all()
    serializer_class = DriverAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]


class AdminDeliveryViewSet(viewsets.ReadOnlyModelViewSet):
    """Dispatch board: every delivery, filterable by ?status=, with an assign action."""
    queryset = Delivery.objects.select_related("order", "driver", "driver__user").all()
    serializer_class = DeliveryAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """POST {driver_id} — dispatches this delivery to a driver, like tapping a
        driver on a Bolt dispatch map."""
        delivery = self.get_object()
        serializer = AssignDriverSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = get_object_or_404(Driver, pk=serializer.validated_data["driver_id"], is_active=True)
        delivery.driver = driver
        delivery.save(update_fields=["driver"])
        delivery.transition(Delivery.Status.ASSIGNED, note=f"Dispatched by admin to {driver.display_name}")
        return Response(DeliveryAdminSerializer(delivery).data)
