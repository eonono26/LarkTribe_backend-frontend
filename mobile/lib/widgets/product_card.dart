import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/models.dart';
import '../theme/app_theme.dart';
import '../services/api_service.dart';
import 'wishlist_button.dart';

String formatKES(String amount) {
  final n = double.tryParse(amount) ?? 0;
  return 'KSh ${n.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
}

String mediaUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http')) return path;
  final base = ApiService.instance.baseUrl.replaceAll(RegExp(r'/api$'), '');
  return '$base$path';
}

class ProductCard extends StatelessWidget {
  final ProductListItem product;
  final VoidCallback onTap;

  const ProductCard({super.key, required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.line),
          borderRadius: BorderRadius.circular(10),
        ),
        clipBehavior: Clip.antiAlias,
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
                    child: product.image != null
                        ? CachedNetworkImage(
                            imageUrl: mediaUrl(product.image),
                            fit: BoxFit.cover,
                            errorWidget: (c, u, e) => const Center(
                              child: Text('No image', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            ),
                          )
                        : const Center(
                            child: Text('No image yet', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ),
                  ),
                  if (product.discountPercent > 0)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(color: AppColors.flag, borderRadius: BorderRadius.circular(4)),
                        child: Text(
                          '-${product.discountPercent}%',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: WishlistButton(productId: product.id, size: 16),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.vendorName.toUpperCase(),
                    style: const TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 0.4),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(formatKES(product.price), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
