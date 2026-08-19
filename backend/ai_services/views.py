# ai/views.py - Updated to include full image URLs

from django.shortcuts import get_object_or_404
from rest_framework import views, permissions, generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from catalog.models import Product
from catalog.serializers import ProductListSerializer
from orders.models import Order
from .engines import recommendations, search as search_engine, chatbot, pricing, forecasting, segmentation, fraud, marketing
from .models import ChatSession, ChatMessage, CustomerSegment, FraudSignal
from .serializers import ChatMessageSerializer, ChatAskSerializer, CustomerSegmentSerializer, FraudSignalSerializer


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) == "admin")


class IsVendorOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return u.is_authenticated and (u.is_staff or getattr(u, "role", None) in ("admin", "vendor"))


# ---------- Customer-facing AI ----------

class RecommendedForYouView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        session_key = request.query_params.get("session_key", "")
        products = recommendations.recommend_for_user(
            user=request.user if request.user.is_authenticated else None,
            session_key=session_key,
            limit=int(request.query_params.get("limit", 12)),
        )
        # Pass request context to serializer so image URLs are absolute
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)


class SimilarProductsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        product = get_object_or_404(Product, id=product_id)
        products = recommendations.similar_products(product, limit=int(request.query_params.get("limit", 8)))
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)


class FrequentlyBoughtTogetherView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        product = get_object_or_404(Product, id=product_id)
        products = recommendations.frequently_bought_with(product, limit=int(request.query_params.get("limit", 6)))
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)


class SmartSearchView(views.APIView):
    """Search with typo correction; falls back to corrected query automatically."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "")
        products, used_query, was_corrected = search_engine.smart_search(query)
        return Response({
            "query": query,
            "used_query": used_query,
            "corrected": was_corrected,
            "results": ProductListSerializer(products, many=True, context={'request': request}).data,
        })


class ImageSearchView(views.APIView):
    """Upload a photo to find visually similar items (see engines/search.py for caveats)."""
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request):
        image = request.FILES.get("image")
        if not image:
            return Response({"detail": "image file is required"}, status=status.HTTP_400_BAD_REQUEST)
        products = search_engine.image_search(image)
        return Response(ProductListSerializer(products, many=True, context={'request': request}).data)


class ChatbotView(views.APIView):
    """AI shopping assistant. Creates/continues a ChatSession and returns product cards when relevant."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ChatAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        session = None
        if data.get("session_id"):
            session = ChatSession.objects.filter(id=data["session_id"]).first()
        if not session:
            session = ChatSession.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_key=request.data.get("session_key", ""),
            )

        ChatMessage.objects.create(session=session, sender="user", text=data["message"])
        reply_text, products = chatbot.answer(data["message"], user=request.user if request.user.is_authenticated else None)
        bot_msg = ChatMessage.objects.create(session=session, sender="bot", text=reply_text)
        if products:
            bot_msg.products.set([p.id for p in products])

        # Pass request context to serializer for image URLs
        return Response({
            "session_id": session.id, 
            "reply": ChatMessageSerializer(bot_msg, context={'request': request}).data
        })


# ---------- Vendor-facing AI ----------

class VendorPricingSuggestionsView(views.APIView):
    """AI Sales Insights: dynamic pricing suggestions for a vendor's own catalog."""
    permission_classes = [IsVendorOrAdmin]

    def get(self, request):
        if not hasattr(request.user, "vendor_profile"):
            return Response([])
        products = Product.objects.filter(vendor=request.user.vendor_profile, status=Product.Status.ACTIVE)
        return Response([pricing.suggest_price(p) for p in products])


class VendorDemandForecastView(views.APIView):
    """AI Sales Insights: sales/inventory forecasting for a vendor's own catalog."""
    permission_classes = [IsVendorOrAdmin]

    def get(self, request):
        if not hasattr(request.user, "vendor_profile"):
            return Response([])
        products = Product.objects.filter(vendor=request.user.vendor_profile, status=Product.Status.ACTIVE)
        return Response([forecasting.forecast_product_demand(p) for p in products])


# ---------- Admin AI dashboard ----------

class AdminAIDashboardView(views.APIView):
    """Single payload for the admin 'AI Dashboard': segmentation, churn, forecast, fraud, marketing."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        segments = CustomerSegment.objects.all()
        segment_breakdown = {}
        for s in segments:
            segment_breakdown[s.segment] = segment_breakdown.get(s.segment, 0) + 1

        return Response({
            "customer_segments": segment_breakdown,
            "at_risk_customers": CustomerSegmentSerializer(
                segments.filter(segment__in=["at_risk", "churned"]).order_by("-monetary")[:10], many=True
            ).data,
            "sales_forecast": forecasting.sales_forecast_overview(),
            "flagged_orders": FraudSignalSerializer(
                FraudSignal.objects.filter(flagged=True, reviewed=False)[:10], many=True
            ).data,
            "marketing_suggestions": marketing.generate_suggestions(),
        })


class RecomputeSegmentsView(views.APIView):
    """Admin trigger to recompute RFM segments + churn scores for all customers."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        count = segmentation.recompute_all_segments()
        return Response({"updated": count})


class CustomerSegmentListView(generics.ListAPIView):
    serializer_class = CustomerSegmentSerializer
    permission_classes = [IsAdminUser]
    queryset = CustomerSegment.objects.all()
    filterset_fields = ["segment"]


class FraudSignalListView(generics.ListAPIView):
    serializer_class = FraudSignalSerializer
    permission_classes = [IsAdminUser]
    queryset = FraudSignal.objects.all()


class ScoreOrderFraudView(views.APIView):
    """Runs fraud scoring for an order (called from checkout / order-detail admin action)."""
    permission_classes = [IsAdminUser]

    def post(self, request, order_id):
        order = get_object_or_404(Order, id=order_id)
        result = fraud.score_order(order)
        signal, _ = FraudSignal.objects.update_or_create(
            order=order,
            defaults=dict(risk_score=result["risk_score"], reasons=result["reasons"], flagged=result["flagged"]),
        )
        return Response(FraudSignalSerializer(signal).data)