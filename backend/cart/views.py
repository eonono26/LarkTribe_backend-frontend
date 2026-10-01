from rest_framework import views, permissions, status
from rest_framework.response import Response
from catalog.models import Product
from .models import Cart, CartItem
from .serializers import CartSerializer


def get_or_create_cart(request):
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart
    if not request.session.session_key:
        request.session.create()
    cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key, user=None)
    return cart


class CartView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cart = get_or_create_cart(request)
        return Response(CartSerializer(cart, context={"request": request}).data)


def _bad_request(message):
    return Response({"detail": message}, status=status.HTTP_400_BAD_REQUEST)


class CartItemView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cart = get_or_create_cart(request)

        try:
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            return _bad_request("Quantity must be a whole number.")

        if quantity < 1:
            return _bad_request("Quantity must be at least 1.")

        try:
            product = Product.objects.get(
                pk=request.data.get("product_id"),
                status=Product.Status.ACTIVE,
            )
        except (Product.DoesNotExist, TypeError, ValueError):
            return _bad_request("This product is no longer available.")

        variant_id = request.data.get("variant_id") or None
        variants = list(product.variants.all())

        if variant_id is not None:
            # The color/size the shopper picked must be a real variant of THIS
            # product - otherwise a stale or forged id could put the wrong
            # color (or another product's variant) in the bag.
            variant = next((v for v in variants if str(v.id) == str(variant_id)), None)
            if variant is None:
                return _bad_request("That color/size is not available for this product.")
        elif len(variants) == 1:
            variant = variants[0]
        elif len(variants) > 1:
            return _bad_request("Please choose a color and size first.")
        else:
            variant = None

        available = variant.stock if variant else product.stock

        item = cart.items.filter(product=product, variant=variant).first()
        already_in_bag = item.quantity if item else 0

        if already_in_bag + quantity > available:
            label = " / ".join(filter(None, [variant.color, variant.size])) if variant else ""
            what = f"{product.name} ({label})" if label else product.name
            if available <= 0:
                return _bad_request(f"{what} is out of stock.")
            return _bad_request(f"Only {available} of {what} left in stock.")

        if item:
            item.quantity = already_in_bag + quantity
            item.save()
        else:
            CartItem.objects.create(
                cart=cart, product=product, variant=variant, quantity=quantity,
            )

        return Response(CartSerializer(cart, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def patch(self, request, item_id):
        cart = get_or_create_cart(request)
        item = cart.items.select_related("product", "variant").get(id=item_id)

        try:
            quantity = int(request.data.get("quantity", item.quantity))
        except (TypeError, ValueError):
            return _bad_request("Quantity must be a whole number.")

        if quantity < 1:
            return _bad_request("Quantity must be at least 1.")

        available = item.variant.stock if item.variant else item.product.stock
        if quantity > available:
            return _bad_request(f"Only {available} left in stock.")

        item.quantity = quantity
        item.save()
        return Response(CartSerializer(cart, context={"request": request}).data)

    def delete(self, request, item_id):
        cart = get_or_create_cart(request)
        cart.items.filter(id=item_id).delete()
        return Response(CartSerializer(cart, context={"request": request}).data)
