from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import DeviceToken, NotificationPreference, Notification, SupportTicket, SupportReply
from .serializers import (
    DeviceTokenSerializer, NotificationPreferenceSerializer, NotificationSerializer,
    SupportTicketSerializer, SupportReplySerializer,
)


class DeviceTokenView(generics.CreateAPIView):
    """Register a push token (web push / FCM / APNs) for the current user."""
    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, _ = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """In-app notification inbox: order updates, promotions, AI recommendations, etc."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"status": "read"})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"status": "all read"})


class SupportTicketViewSet(viewsets.ModelViewSet):
    """Customer support: users open tickets, staff (admin) reply and change status."""
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff or self.request.user.role == "admin":
            return SupportTicket.objects.all()
        return SupportTicket.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        ticket = self.get_object()
        is_staff = request.user.is_staff or request.user.role == "admin"
        reply = SupportReply.objects.create(
            ticket=ticket, author=request.user, is_staff_reply=is_staff,
            message=request.data.get("message", ""),
        )
        if is_staff:
            ticket.status = SupportTicket.Status.IN_PROGRESS
            ticket.save(update_fields=["status"])
        return Response(SupportReplySerializer(reply).data)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = SupportTicket.Status.RESOLVED
        ticket.save(update_fields=["status"])
        return Response({"status": "resolved"})
