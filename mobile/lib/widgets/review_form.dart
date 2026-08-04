import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../screens/login_screen.dart';

class ReviewForm extends StatefulWidget {
  final int productId;
  final VoidCallback? onSubmitted;
  const ReviewForm({super.key, required this.productId, this.onSubmitted});

  @override
  State<ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends State<ReviewForm> {
  int _rating = 5;
  final _commentCtrl = TextEditingController();
  bool _saving = false;
  bool _done = false;
  String? _error;

  Future<void> _submit() async {
    if (!ApiService.instance.isLoggedIn) {
      final signedIn = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
      if (signedIn != true) return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    final ok = await ApiService.instance.addReview(widget.productId, _rating, _commentCtrl.text);
    setState(() {
      _saving = false;
      if (ok) {
        _done = true;
        widget.onSubmitted?.call();
      } else {
        _error = "Couldn't submit your review — you may have already reviewed this product.";
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_done) {
      return const Text('Thanks — your review was submitted.', style: TextStyle(color: Colors.grey));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(5, (i) {
            final n = i + 1;
            return GestureDetector(
              onTap: () => setState(() => _rating = n),
              child: Icon(
                n <= _rating ? Icons.star : Icons.star_border,
                color: AppColors.signal,
                size: 22,
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _commentCtrl,
          maxLines: 3,
          decoration: const InputDecoration(hintText: 'Share your experience with this product…'),
        ),
        if (_error != null) ...[
          const SizedBox(height: 6),
          Text(_error!, style: const TextStyle(color: AppColors.flag, fontSize: 12)),
        ],
        const SizedBox(height: 10),
        ElevatedButton(onPressed: _saving ? null : _submit, child: Text(_saving ? 'Submitting…' : 'Submit review')),
      ],
    );
  }
}
