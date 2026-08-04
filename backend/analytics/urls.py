from django.urls import path
from .views import TrackEventView, AdminReportsView, DailyMetricsView

urlpatterns = [
    path("track/", TrackEventView.as_view(), name="track-event"),
    path("admin/reports/", AdminReportsView.as_view(), name="admin-reports"),
    path("admin/daily-metrics/", DailyMetricsView.as_view(), name="admin-daily-metrics"),
]
