from rest_framework import permissions


class IsDriver(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u.is_authenticated and hasattr(u, "driver_profile") and u.driver_profile.is_active)


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin"))
