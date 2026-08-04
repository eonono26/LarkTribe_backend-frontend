from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/vendors/", include("vendors.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/cart/", include("cart.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/promotions/", include("promotions.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/ai/", include("ai_services.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
