import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../screens/login_screen.dart';

class WishlistButton extends StatefulWidget {
  final int productId;
  final double size;
  const WishlistButton({super.key, required this.productId, this.size = 20});

  @override
  State<WishlistButton> createState() => _WishlistButtonState();
}

class _WishlistButtonState extends State<WishlistButton> {
  int? _wishlistItemId;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (ApiService.instance.isLoggedIn) {
      ApiService.instance.wishlist().then((items) {
        final match = items.where((w) => w.product.id == widget.productId);
        if (match.isNotEmpty && mounted) setState(() => _wishlistItemId = match.first.id);
      });
    }
  }

  Future<void> _toggle() async {
    if (!ApiService.instance.isLoggedIn) {
      await Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
      return;
    }
    setState(() => _loading = true);
    try {
      if (_wishlistItemId != null) {
        await ApiService.instance.removeFromWishlist(_wishlistItemId!);
        setState(() => _wishlistItemId = null);
      } else {
        final item = await ApiService.instance.addToWishlist(widget.productId);
        ApiService.instance.track('wishlist_add', extra: {'product': widget.productId});
        setState(() => _wishlistItemId = item.id);
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final active = _wishlistItemId != null;
    return GestureDetector(
      onTap: _loading ? null : _toggle,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: const BoxDecoration(color: Colors.white70, shape: BoxShape.circle),
        child: Icon(
          active ? Icons.favorite : Icons.favorite_border,
          size: widget.size,
          color: active ? AppColors.flag : AppColors.ink,
        ),
      ),
    );
  }
}
