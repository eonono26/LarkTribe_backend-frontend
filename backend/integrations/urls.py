from django.urls import path
from . import views

urlpatterns = [
    path("public-config/", views.PublicConfigView.as_view()),
    path("delivery-estimate/", views.DeliveryEstimateView.as_view()),
    path("pickup-points/", views.PickupPointsView.as_view()),
    path("location-ping/", views.LocationPingView.as_view()),
    path("popular-near/", views.PopularNearView.as_view()),
    path("admin/location-stats/", views.AdminLocationStatsView.as_view()),
    path("feeds/meta.csv", views.MetaFeedCsvView.as_view()),
    path("feeds/meta.xml", views.MetaFeedXmlView.as_view()),
]
