import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import 'login_screen.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<OrderSummary> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!ApiService.instance.isLoggedIn) {
      final signedIn = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
      if (signedIn != true) {
        if (mounted) Navigator.pop(context);
        return;
      }
    }
    final orders = await ApiService.instance.myOrders();
    if (mounted) setState(() {
      _orders = orders;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My orders')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(child: Text('No orders yet.', style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _orders.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final o = _orders[i];
                    return ListTile(
                      tileColor: AppColors.mist,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      title: Text(o.orderNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(o.status.replaceAll('_', ' ')),
                      trailing: Text(formatKES(o.total), style: const TextStyle(fontWeight: FontWeight.bold)),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => OrderDetailScreen(orderNumber: o.orderNumber)),
                      ),
                    );
                  },
                ),
    );
  }
}
