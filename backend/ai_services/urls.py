from django.urls import path
from . import views

urlpatterns = [
    # customer-facing
    path("recommended-for-you/", views.RecommendedForYouView.as_view(), name="ai-recommended"),
    path("products/<int:product_id>/similar/", views.SimilarProductsView.as_view(), name="ai-similar"),
    path("products/<int:product_id>/frequently-bought-together/", views.FrequentlyBoughtTogetherView.as_view(), name="ai-fbt"),
    path("search/", views.SmartSearchView.as_view(), name="ai-smart-search"),
    path("image-search/", views.ImageSearchView.as_view(), name="ai-image-search"),
    path("size-recommendation/", views.SizeRecommendationView.as_view(), name="ai-size-recommendation"),
    path("chatbot/", views.ChatbotView.as_view(), name="ai-chatbot"),

    # shop-owner insights (admin only)
    path("admin/pricing-suggestions/", views.PricingSuggestionsView.as_view(), name="ai-pricing"),
    path("admin/demand-forecast/", views.DemandForecastView.as_view(), name="ai-forecast"),
    path("admin/pricing-suggestions/<int:product_id>/apply/", views.ApplyPricingView.as_view(), name="ai-pricing-apply"),
    path("admin/demand-forecast/<int:product_id>/request-reorder/", views.RequestReorderView.as_view(), name="ai-reorder-request"),

    # admin-facing (AI Dashboard)
    path("admin/dashboard/", views.AdminAIDashboardView.as_view(), name="ai-admin-dashboard"),
    path("admin/segments/", views.CustomerSegmentListView.as_view(), name="ai-admin-segments"),
    path("admin/segments/recompute/", views.RecomputeSegmentsView.as_view(), name="ai-admin-segments-recompute"),
    path("admin/fraud-signals/", views.FraudSignalListView.as_view(), name="ai-admin-fraud"),
    path("admin/orders/<int:order_id>/score-fraud/", views.ScoreOrderFraudView.as_view(), name="ai-admin-score-fraud"),
]
