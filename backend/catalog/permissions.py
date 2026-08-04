from rest_framework import permissions


class IsOwnerVendorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return hasattr(request.user, "vendor_profile") and obj.vendor == request.user.vendor_profile
