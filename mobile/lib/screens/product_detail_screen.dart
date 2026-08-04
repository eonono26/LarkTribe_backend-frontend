import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import '../widgets/wishlist_button.dart';
import '../widgets/product_row.dart';
import '../widgets/review_form.dart';

class ProductDetailScreen extends StatefulWidget {
  final String slug;
  const ProductDetailScreen({super.key, required this.slug});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductDetail? _product;
  List<Review> _reviews = [];
  bool _adding = false;

  @override
  void initState() {
    super.initState();
    ApiService.instance.product(widget.slug).then((p) {
      setState(() => _product = p);
      ApiService.instance.track('product_view', extra: {'product': p.id});
      ApiService.instance.reviews(p.id).then((r) {
        if (mounted) setState(() => _reviews = r);
      });
    });
  }

  void _reloadReviews() {
    final p = _product;
    if (p == null) return;
    ApiService.instance.reviews(p.id).then((r) {
      if (mounted) setState(() => _reviews = r);
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = _product;
    return Scaffold(
      appBar: AppBar(title: const Text('Product')),
      body: p == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  AspectRatio(
                    aspectRatio: 3 / 4,
                    child: Stack(
                      children: [
                        Container(
                          color: AppColors.mist,
                          width: double.infinity,
                          child: p.images.isNotEmpty
                              ? CachedNetworkImage(imageUrl: mediaUrl(p.images.first), fit: BoxFit.cover)
                              : const Center(child: Text('No image yet', style: TextStyle(color: Colors.grey))),
                        ),
                        Positioned(top: 12, right: 12, child: WishlistButton(productId: p.id, size: 22)),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p.vendorName.toUpperCase(),
                            style: const TextStyle(fontSize: 11, color: Colors.grey, letterSpacing: 0.5)),
                        const SizedBox(height: 4),
                        Text(p.name, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 20)),
                        if (p.ratingCount > 0) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.star, size: 14, color: AppColors.signal),
                              const SizedBox(width: 4),
                              Text('${p.ratingAvg} · ${p.ratingCount} reviews', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                        ],
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Text(formatKES(p.price), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
                            if (p.compareAtPrice != null) ...[
                              const SizedBox(width: 8),
                              Text(
                                formatKES(p.compareAtPrice!),
                                style: const TextStyle(
                                    decoration: TextDecoration.lineThrough, color: Colors.grey),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 20),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: p.stock > 0 && !_adding
                                ? () async {
                                    setState(() => _adding = true);
                                    await context.read<CartProvider>().addItem(p.id);
                                    ApiService.instance.track('cart_add', extra: {'product': p.id});
                                    setState(() => _adding = false);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Added to bag')),
                                      );
                                    }
                                  }
                                : null,
                            child: Text(p.stock > 0 ? (_adding ? 'Adding…' : 'Add to bag') : 'Out of stock'),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(p.description, style: const TextStyle(height: 1.5, color: Colors.black87)),
                        const SizedBox(height: 28),
                        Text('Reviews', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 12),
                        ..._reviews.map((r) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.star, size: 12, color: AppColors.signal),
                                      const SizedBox(width: 4),
                                      Text('${r.rating}/5 · ${r.user}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(r.comment, style: const TextStyle(color: Colors.black87, fontSize: 13)),
                                ],
                              ),
                            )),
                        ReviewForm(productId: p.id, onSubmitted: _reloadReviews),
                      ],
                    ),
                  ),
                  ProductRow(title: 'You may also like', fetcher: () => ApiService.instance.similarProducts(p.id)),
                  ProductRow(
                    title: 'Frequently bought together',
                    fetcher: () => ApiService.instance.frequentlyBoughtTogether(p.id),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
