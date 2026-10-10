from rest_framework import permissions


class IsPlatformAdmin(permissions.BasePermission):
    """Same rule the rest of the backend uses: staff users or role == 'admin'."""

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin"))
