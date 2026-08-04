import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import 'order_detail_screen.dart';

enum _CheckoutMode { member, guest }

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  _CheckoutMode _mode = _CheckoutMode.guest;
  bool _identified = false;
  String? _authError;

  final _emailCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _couponCtrl = TextEditingController();
  String _paymentMethod = 'mpesa';

  bool _placing = false;
  String? _orderNumber;
  String? _error;

  bool _couponChecking = false;
  String? _couponStatus; // 'applied' | 'invalid'
  double _discount = 0;

  Future<void> _continue() async {
    setState(() => _authError = null);
    if (_mode == _CheckoutMode.member) {
      final ok = await ApiService.instance.login(_usernameCtrl.text, _passwordCtrl.text);
      if (!ok) {
        setState(() => _authError = "Couldn't sign you in — check your username and password.");
        return;
      }
    } else {
      if (_emailCtrl.text.isEmpty) {
        setState(() => _authError = 'Enter an email address to continue as guest.');
        return;
      }
    }
    setState(() => _identified = true);
  }

  Future<void> _applyCoupon() async {
    final cart = context.read<CartProvider>().cart;
    if (_couponCtrl.text.trim().isEmpty || cart == null) return;
    setState(() => _couponChecking = true);
    final (valid, discount, _) = await ApiService.instance.validateCoupon(
      _couponCtrl.text.trim(),
      double.tryParse(cart.total) ?? 0,
    );
    setState(() {
      _couponChecking = false;
      _couponStatus = valid ? 'applied' : 'invalid';
      _discount = valid ? discount : 0;
    });
  }

  Future<void> _placeOrder() async {
    setState(() {
      _placing = true;
      _error = null;
    });
    try {
      final result = await ApiService.instance.checkout(
        guestEmail: _mode == _CheckoutMode.guest ? _emailCtrl.text : null,
        paymentMethod: _paymentMethod,
        shippingName: _nameCtrl.text,
        shippingPhone: _phoneCtrl.text,
        shippingAddress: _addressCtrl.text,
        shippingCity: _cityCtrl.text,
        couponCode: _couponStatus == 'applied' ? _couponCtrl.text.trim() : '',
      );
      setState(() => _orderNumber = result['order_number']);
      if (mounted) context.read<CartProvider>().refresh();
    } catch (_) {
      setState(() => _error = 'Something went wrong placing your order. Please try again.');
    } finally {
      setState(() => _placing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_orderNumber != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order placed')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Order placed 🎉', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                Text('Your order $_orderNumber is confirmed.', textAlign: TextAlign.center),
                const SizedBox(height: 20),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    OutlinedButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderNumber: _orderNumber!)),
                      ),
                      child: const Text('Track order'),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: () => Navigator.popUntil(context, (r) => r.isFirst),
                      child: const Text('Continue shopping'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: _identified ? _buildDetailsStep() : _buildIdentifyStep(),
      ),
    );
  }

  Widget _buildIdentifyStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'HOW WOULD YOU LIKE TO\nCHECKOUT?',
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, height: 1.2),
        ),
        const SizedBox(height: 28),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(color: AppColors.mist, borderRadius: BorderRadius.circular(999)),
          child: Row(
            children: [
              Expanded(child: _toggleButton('Member login', _CheckoutMode.member)),
              Expanded(child: _toggleButton('Guest checkout', _CheckoutMode.guest)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (_mode == _CheckoutMode.member) ...[
          TextField(controller: _usernameCtrl, decoration: const InputDecoration(hintText: 'Username')),
          const SizedBox(height: 10),
          TextField(
            controller: _passwordCtrl,
            obscureText: true,
            decoration: const InputDecoration(hintText: 'Password'),
          ),
          const SizedBox(height: 8),
          const Text('Sign in to check out faster next time.', style: TextStyle(color: Colors.grey, fontSize: 13)),
        ] else ...[
          TextField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(hintText: 'Enter email address'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Checkout quickly as a guest (you can create an account later if you wish).',
            style: TextStyle(color: Colors.grey, fontSize: 13),
          ),
        ],
        if (_authError != null) ...[
          const SizedBox(height: 10),
          Text(_authError!, style: const TextStyle(color: AppColors.flag, fontSize: 13)),
        ],
        const SizedBox(height: 24),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.signal, foregroundColor: AppColors.ink),
          onPressed: _continue,
          child: const Text('Continue'),
        ),
      ],
    );
  }

  Widget _toggleButton(String label, _CheckoutMode mode) {
    final selected = _mode == mode;
    return GestureDetector(
      onTap: () => setState(() => _mode = mode),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.ink : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            color: selected ? Colors.white : Colors.grey[600],
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildDetailsStep() {
    final cart = context.watch<CartProvider>().cart;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Delivery & payment', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        TextField(controller: _nameCtrl, decoration: const InputDecoration(hintText: 'Full name')),
        const SizedBox(height: 10),
        TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(hintText: 'Phone number (for M-Pesa & delivery)'),
        ),
        const SizedBox(height: 10),
        TextField(controller: _addressCtrl, decoration: const InputDecoration(hintText: 'Delivery address')),
        const SizedBox(height: 10),
        TextField(controller: _cityCtrl, decoration: const InputDecoration(hintText: 'Town / City')),
        const SizedBox(height: 16),
        const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Row(
          children: [
            _paymentOption('mpesa', 'M-Pesa'),
            const SizedBox(width: 8),
            _paymentOption('card', 'Card'),
            const SizedBox(width: 8),
            _paymentOption('cod', 'Cash'),
          ],
        ),
        const SizedBox(height: 16),
        const Text('Coupon code', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _couponCtrl,
                enabled: _couponStatus != 'applied',
                decoration: const InputDecoration(hintText: 'e.g. WELCOME10'),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: (_couponChecking || _couponStatus == 'applied') ? null : _applyCoupon,
              child: Text(_couponStatus == 'applied' ? 'Applied' : 'Apply'),
            ),
          ],
        ),
        if (_couponStatus == 'applied')
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text('Coupon applied — ${formatKES(_discount.toStringAsFixed(2))} off.',
                style: const TextStyle(color: AppColors.deptMaternity, fontSize: 13)),
          ),
        if (_couponStatus == 'invalid')
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text('Invalid or expired coupon.', style: TextStyle(color: AppColors.flag, fontSize: 13)),
          ),
        const SizedBox(height: 20),
        if (cart != null) ...[
          if (_discount > 0)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Coupon discount', style: TextStyle(color: AppColors.deptMaternity)),
                  Text('-${formatKES(_discount.toStringAsFixed(2))}', style: const TextStyle(color: AppColors.deptMaternity)),
                ],
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total'),
              Text(
                formatKES(((double.tryParse(cart.total) ?? 0) - _discount).toStringAsFixed(2)),
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: AppColors.flag, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: AppColors.signal, foregroundColor: AppColors.ink),
          onPressed: (_placing || _nameCtrl.text.isEmpty) ? null : _placeOrder,
          child: Text(_placing ? 'Placing order…' : 'Place order'),
        ),
      ],
    );
  }

  Widget _paymentOption(String value, String label) {
    final selected = _paymentMethod == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _paymentMethod = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.ink : Colors.transparent,
            border: Border.all(color: selected ? AppColors.ink : AppColors.line),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: selected ? Colors.white : AppColors.ink,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }
}
