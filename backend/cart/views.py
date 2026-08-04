from rest_framework import views, permissions, status
from rest_framework.response import Response
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
        return Response(CartSerializer(cart).data)


class CartItemView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cart = get_or_create_cart(request)
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))
        variant_id = request.data.get("variant_id")
        item, created = CartItem.objects.get_or_create(
            cart=cart, product_id=product_id, variant_id=variant_id,
            defaults={"quantity": quantity},
        )
        if not created:
            item.quantity += quantity
            item.save()
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)

    def patch(self, request, item_id):
        cart = get_or_create_cart(request)
        item = cart.items.get(id=item_id)
        item.quantity = int(request.data.get("quantity", item.quantity))
        item.save()
        return Response(CartSerializer(cart).data)

    def delete(self, request, item_id):
        cart = get_or_create_cart(request)
        cart.items.filter(id=item_id).delete()
        return Response(CartSerializer(cart).data)
