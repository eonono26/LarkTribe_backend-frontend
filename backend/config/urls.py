from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from catalog.github_storage import github_media

urlpatterns = [
    path("admin/", admin.site.urls),
    re_path(r"^api/catalog/github-media/(?P<path>.*)$", github_media, name="github-test-media"),
    path("api/auth/", include("accounts.urls")),
    path("api/vendors/", include("vendors.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/cart/", include("cart.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/promotions/", include("promotions.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/ai/", include("ai_services.urls")),
    path("api/localization/", include("localization.urls")),
    path("api/delivery/", include("delivery.urls")),
    path("api/admin-panel/", include("adminpanel.urls")),
    path("api/tryon/", include("tryon.urls")),
    path("api/integrations/", include("integrations.urls")),
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
