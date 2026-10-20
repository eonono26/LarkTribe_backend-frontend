from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers
from .models import Driver, Delivery, DeliveryEvent


class DriverPublicSerializer(serializers.ModelSerializer):
    """What a customer sees about their driver while tracking — no phone/plate
    beyond what's needed to identify the vehicle at the door."""
    name = serializers.CharField(source="display_name", read_only=True)
    vehicle_type_display = serializers.CharField(source="get_vehicle_type_display", read_only=True)

    class Meta:
        model = Driver
        fields = ["id", "name", "phone", "vehicle_type", "vehicle_type_display", "vehicle_plate", "current_lat", "current_lng", "rating_avg"]


class DriverMeSerializer(serializers.ModelSerializer):
    """A driver's own profile — includes the online toggle and location they post."""
    name = serializers.CharField(source="display_name", read_only=True)

    class Meta:
        model = Driver
        fields = [
            "id", "name", "phone", "vehicle_type", "vehicle_plate", "photo",
            "is_active", "is_online", "current_lat", "current_lng", "last_location_at",
            "rating_avg", "rating_count",
        ]
        read_only_fields = ["id", "is_active", "rating_avg", "rating_count", "last_location_at"]


class DriverAdminSerializer(serializers.ModelSerializer):
    """Admin can create driver logins and manage their operational profile."""
    name = serializers.CharField(source="display_name", read_only=True)
    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    active_delivery_count = serializers.SerializerMethodField()

    class Meta:
        model = Driver
        fields = [
            "id", "name", "username", "password", "first_name", "last_name", "email",
            "phone", "vehicle_type", "vehicle_plate", "is_active", "is_online",
            "current_lat", "current_lng", "last_location_at", "rating_avg", "rating_count",
            "active_delivery_count", "created_at",
        ]
        read_only_fields = [
            "id", "name", "is_online", "current_lat", "current_lng", "last_location_at",
            "rating_avg", "rating_count", "active_delivery_count", "created_at",
        ]

    def validate(self, attrs):
        if self.instance is None:
            for field in ("username", "password", "phone"):
                if not attrs.get(field):
                    raise serializers.ValidationError({field: "This field is required when creating a driver."})
            User = get_user_model()
            if User.objects.filter(username=attrs["username"]).exists():
                raise serializers.ValidationError({"username": "This username is already in use."})
            email = attrs.get("email", "")
            if email and User.objects.filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "This email is already in use."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        User = get_user_model()
        username = validated_data.pop("username")
        password = validated_data.pop("password")
        first_name = validated_data.pop("first_name", "")
        last_name = validated_data.pop("last_name", "")
        email = validated_data.pop("email", "")
        phone = validated_data.get("phone", "")
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=User.Role.DRIVER,
            is_active=True,
        )
        validated_data["user"] = user
        validated_data["is_active"] = True
        return Driver.objects.create(**validated_data)

    def get_active_delivery_count(self, obj):
        return obj.deliveries.exclude(status__in=[Delivery.Status.DELIVERED, Delivery.Status.CANCELLED, Delivery.Status.FAILED]).count()


class DeliveryEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryEvent
        fields = ["id", "status", "note", "lat", "lng", "created_at"]


class DeliveryTrackingSerializer(serializers.ModelSerializer):
    """Customer-facing tracking payload — order + driver + live position + timeline."""
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    driver = DriverPublicSerializer(read_only=True)
    events = DeliveryEventSerializer(many=True, read_only=True)

    class Meta:
        model = Delivery
        fields = [
            "id", "order_number", "status", "driver",
            "pickup_label", "pickup_lat", "pickup_lng",
            "dropoff_label", "dropoff_lat", "dropoff_lng",
            "assigned_at", "picked_up_at", "delivered_at", "created_at", "events",
        ]


class DeliveryAdminSerializer(serializers.ModelSerializer):
    """Dispatch-board row — one delivery with enough order context to assign a driver."""
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_total = serializers.DecimalField(source="order.total", max_digits=10, decimal_places=2, read_only=True)
    shipping_name = serializers.CharField(source="order.shipping_name", read_only=True)
    shipping_phone = serializers.CharField(source="order.shipping_phone", read_only=True)
    shipping_city = serializers.CharField(source="order.shipping_city", read_only=True)
    driver = DriverAdminSerializer(read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Delivery
        fields = [
            "id", "order_number", "order_total", "shipping_name", "shipping_phone", "shipping_city",
            "status", "driver", "item_count",
            "pickup_label", "pickup_lat", "pickup_lng",
            "dropoff_label", "dropoff_lat", "dropoff_lng",
            "assigned_at", "picked_up_at", "delivered_at", "created_at", "updated_at",
        ]

    def get_item_count(self, obj):
        return obj.order.items.count()


class AssignDriverSerializer(serializers.Serializer):
    driver_id = serializers.IntegerField()
