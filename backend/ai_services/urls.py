from django.urls import path
from . import views

urlpatterns = [
    # customer-facing
    path("recommended-for-you/", views.RecommendedForYouView.as_view(), name="ai-recommended"),
    path("products/<int:product_id>/similar/", views.SimilarProductsView.as_view(), name="ai-similar"),
    path("products/<int:product_id>/frequently-bought-together/", views.FrequentlyBoughtTogetherView.as_view(), name="ai-fbt"),
    path("search/", views.SmartSearchView.as_view(), name="ai-smart-search"),
    path("image-search/", views.ImageSearchView.as_view(), name="ai-image-search"),
    path("try-on/", views.TryOnView.as_view(), name="ai-try-on"),
    path("saved-looks/", views.SavedLookListCreateView.as_view(), name="ai-saved-looks"),
    path("saved-looks/<int:pk>/", views.SavedLookDetailView.as_view(), name="ai-saved-look-detail"),
    path("size-recommendation/", views.SizeRecommendationView.as_view(), name="ai-size-recommendation"),
    path("chatbot/", views.ChatbotView.as_view(), name="ai-chatbot"),

    # vendor-facing (AI Sales Insights)
    path("vendor/pricing-suggestions/", views.VendorPricingSuggestionsView.as_view(), name="ai-vendor-pricing"),
    path("vendor/demand-forecast/", views.VendorDemandForecastView.as_view(), name="ai-vendor-forecast"),
    path("vendor/pricing-suggestions/<int:product_id>/apply/", views.ApplyVendorPricingView.as_view(), name="ai-vendor-pricing-apply"),
    path("vendor/demand-forecast/<int:product_id>/request-reorder/", views.RequestVendorReorderView.as_view(), name="ai-vendor-reorder-request"),

    # admin-facing (AI Dashboard)
    path("admin/dashboard/", views.AdminAIDashboardView.as_view(), name="ai-admin-dashboard"),
    path("admin/segments/", views.CustomerSegmentListView.as_view(), name="ai-admin-segments"),
    path("admin/segments/recompute/", views.RecomputeSegmentsView.as_view(), name="ai-admin-segments-recompute"),
    path("admin/fraud-signals/", views.FraudSignalListView.as_view(), name="ai-admin-fraud"),
    path("admin/orders/<int:order_id>/score-fraud/", views.ScoreOrderFraudView.as_view(), name="ai-admin-score-fraud"),
]
