# ai/views.py - Updated to include full image URLs

from django.shortcuts import get_object_or_404
from rest_framework import views, permissions, generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
from catalog.models import Product
from catalog.serializers import ProductListSerializer
from orders.models import Order
from notifications.models import SupportTicket
from .engines import tryon, sizing, recommendations, search as search_engine, chatbot, pricing, forecasting, segmentation, fraud, marketing
from .models import ChatSession, ChatMessage, CustomerSegment, FraudSignal, SavedLook
from .serializers import ChatMessageSerializer, ChatAskSerializer, CustomerSegmentSerializer, FraudSignalSerializer, SavedLookSerializer


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
    """Shopping assistant for product discovery, order questions, and real support-ticket creation."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ChatAskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session_key = request.data.get("session_key", "")

        session = None
        if data.get("session_id"):
            sessions = ChatSession.objects.filter(id=data["session_id"])
            if request.user.is_authenticated:
                sessions = sessions.filter(user=request.user)
            else:
                sessions = sessions.filter(user__isnull=True, session_key=session_key)
            session = sessions.first()
        if not session:
            session = ChatSession.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_key=session_key,
            )

        latest_bot = session.messages.filter(sender=ChatMessage.Sender.BOT).order_by("-created_at").first()
        awaiting_ticket_details = bool(
            latest_bot and "describe the issue in one message" in latest_bot.text.lower()
        )
        awaiting_order_number = bool(
            latest_bot and "send your order number and i'll check" in latest_bot.text.lower()
        )
        ChatMessage.objects.create(session=session, sender="user", text=data["message"])

        if awaiting_ticket_details:
            if request.user.is_authenticated:
                ticket = SupportTicket.objects.create(
                    user=request.user,
                    subject="Shopping assistant support request",
                    message=data["message"],
                )
                reply_text = f"Your support ticket #{ticket.id} has been created. Our team will follow up from your account's Support page."
            else:
                reply_text = "Please sign in before sending a support request. Then open Account → Support to submit your message."
            products = []
        else:
            reply_text, products = chatbot.answer(
                data["message"],
                user=request.user if request.user.is_authenticated else None,
                awaiting_order_number=awaiting_order_number,
            )

        bot_msg = ChatMessage.objects.create(session=session, sender="bot", text=reply_text)
        if products:
            bot_msg.products.set([p.id for p in products])

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


class ApplyVendorPricingView(views.APIView):
    """Apply an AI-generated suggested price to one of the vendor's own products."""
    permission_classes = [IsVendorOrAdmin]

    def post(self, request, product_id):
        if not hasattr(request.user, "vendor_profile"):
            return Response({"detail": "Vendor profile is required."}, status=status.HTTP_403_FORBIDDEN)
        product = get_object_or_404(
            Product,
            id=product_id,
            vendor=request.user.vendor_profile,
        )
        result = pricing.suggest_price(product)
        product.price = result["suggested_price"]
        product.save(update_fields=["price"])
        return Response({
            "product_id": product.id,
            "previous_price": float(result["current_price"]),
            "current_price": float(product.price),
            "change_percent": result["change_percent"],
            "reason": result["reason"],
        })


class RequestVendorReorderView(views.APIView):
    """Create a real replenishment support request from an AI demand forecast."""
    permission_classes = [IsVendorOrAdmin]

    def post(self, request, product_id):
        if not hasattr(request.user, "vendor_profile"):
            return Response({"detail": "Vendor profile is required."}, status=status.HTTP_403_FORBIDDEN)
        product = get_object_or_404(
            Product,
            id=product_id,
            vendor=request.user.vendor_profile,
        )
        forecast = forecasting.forecast_product_demand(product)
        if not forecast["reorder_recommended"]:
            return Response({
                "detail": "This product is not currently below its AI reorder point.",
                "forecast": forecast,
            }, status=status.HTTP_400_BAD_REQUEST)

        ticket = SupportTicket.objects.create(
            user=request.user,
            subject=f"Replenishment request: {product.name}",
            message=(
                f"AI reorder request for product #{product.id} ({product.name}). "
                f"Suggested quantity: {forecast['reorder_quantity']} units. "
                f"Current stock: {forecast['current_stock']}; reorder point: {forecast['reorder_point']}."
            ),
        )
        return Response({
            "ticket_id": ticket.id,
            "product_id": product.id,
            "reorder_quantity": forecast["reorder_quantity"],
            "detail": "Replenishment request submitted to LarkTribe operations.",
        }, status=status.HTTP_201_CREATED)


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

# ---------- Virtual try-on (proposal item 1) ----------

class TryOnView(views.APIView):
    """
    POST multipart: photo (file), product_id, consent=true, optional color.

    The shopper's photo is validated, processed in memory and never stored.
    Returns the generated preview image bytes. 503 {"code": "not_configured"}
    until an AI provider is approved and configured (see engines/tryon.py).
    """
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        if str(request.data.get("consent", "")).lower() not in {"true", "1", "yes", "on"}:
            return Response({"detail": "Photo permission must be confirmed."}, status=status.HTTP_400_BAD_REQUEST)
        photo = request.FILES.get("photo")
        if not photo:
            return Response({"detail": "photo file is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not tryon.is_configured():
            return Response(
                {"code": "not_configured", "detail": "AI try-on is not enabled yet."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        product = get_object_or_404(Product, id=request.data.get("product_id"))
        color = (request.data.get("color") or "").strip()
        images = product.images.all()
        garment = (images.filter(color__iexact=color).first() if color else None) or images.first()
        if not garment:
            return Response({"detail": "This product has no photo to try on."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            person = tryon.normalise_photo(photo.read())
            with garment.image.open("rb") as fh:
                result = tryon.generate(person, fh.read(), product.name)
        except tryon.InvalidPhoto as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except tryon.NotConfigured:
            return Response({"code": "not_configured", "detail": "AI try-on is not enabled yet."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except tryon.ProviderError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        resp = HttpResponse(result, content_type="image/jpeg")
        resp["Cache-Control"] = "no-store"
        return resp


class SavedLookListCreateView(generics.ListCreateAPIView):
    """Saved looks live in the customer's profile; only created on explicit save."""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SavedLookSerializer
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = None

    def get_queryset(self):
        return SavedLook.objects.filter(user=self.request.user).select_related("product")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavedLookDetailView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedLook.objects.filter(user=self.request.user)


class SizeRecommendationView(views.APIView):
    """Guidance only: matches measurements against the product's size chart."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        product = get_object_or_404(Product, id=request.query_params.get("product_id"))
        guide = product.size_guide
        if not guide:
            return Response({"size": None, "detail": "This product has no size chart yet."})

        def num(name):
            try:
                return float(request.query_params.get(name, ""))
            except ValueError:
                return None

        result = sizing.recommend(
            guide.columns, guide.rows,
            height_cm=num("height_cm"), weight_kg=num("weight_kg"), age_years=num("age_years"),
        )
        return Response(result)
