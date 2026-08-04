import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import 'checkout_screen.dart';

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cartProvider = context.watch<CartProvider>();
    final cart = cartProvider.cart;

    return Scaffold(
      appBar: AppBar(title: const Text('Your bag')),
      body: cartProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : (cart == null || cart.items.isEmpty)
              ? const Center(child: Text('Your bag is empty.', style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: cart.items.length,
                  separatorBuilder: (_, __) => const Divider(height: 24),
                  itemBuilder: (context, i) {
                    final item = cart.items[i];
                    return Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            width: 64,
                            height: 80,
                            child: item.product.image != null
                                ? CachedNetworkImage(imageUrl: mediaUrl(item.product.image), fit: BoxFit.cover)
                                : Container(color: AppColors.mist),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.product.name, maxLines: 2, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 4),
                              Text(formatKES(item.product.price), style: const TextStyle(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  IconButton(
                                    visualDensity: VisualDensity.compact,
                                    icon: const Icon(Icons.remove_circle_outline, size: 20),
                                    onPressed: () => context
                                        .read<CartProvider>()
                                        .updateItem(item.id, (item.quantity - 1).clamp(1, 999)),
                                  ),
                                  Text('${item.quantity}'),
                                  IconButton(
                                    visualDensity: VisualDensity.compact,
                                    icon: const Icon(Icons.add_circle_outline, size: 20),
                                    onPressed: () => context.read<CartProvider>().updateItem(item.id, item.quantity + 1),
                                  ),
                                  const Spacer(),
                                  IconButton(
                                    visualDensity: VisualDensity.compact,
                                    icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.flag),
                                    onPressed: () => context.read<CartProvider>().removeItem(item.id),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
      bottomNavigationBar: (cart == null || cart.items.isEmpty)
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total'),
                        Text(formatKES(cart.total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () =>
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const CheckoutScreen())),
                        child: const Text('Checkout'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
