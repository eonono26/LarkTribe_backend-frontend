import 'package:flutter/material.dart';
import '../models/models.dart';
import 'product_card.dart';
import '../screens/product_detail_screen.dart';

/// Horizontal scrolling row used for AI recommendations, similar products,
/// and frequently-bought-together — fetches lazily and hides itself if empty.
class ProductRow extends StatefulWidget {
  final String title;
  final Future<List<ProductListItem>> Function() fetcher;

  const ProductRow({super.key, required this.title, required this.fetcher});

  @override
  State<ProductRow> createState() => _ProductRowState();
}

class _ProductRowState extends State<ProductRow> {
  List<ProductListItem> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    widget.fetcher().then((r) {
      if (mounted) setState(() {
        _products = r;
        _loading = false;
      });
    }).catchError((_) {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_loading || _products.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(widget.title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                const Text('AI POWERED', style: TextStyle(fontSize: 9, color: Colors.grey, letterSpacing: 0.6)),
              ],
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            height: 230,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _products.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final p = _products[i];
                return SizedBox(
                  width: 140,
                  child: ProductCard(
                    product: p,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => ProductDetailScreen(slug: p.slug)),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
