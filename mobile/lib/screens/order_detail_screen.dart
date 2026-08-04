import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';

const _steps = ['pending_payment', 'paid', 'processing', 'shipped', 'delivered'];

class OrderDetailScreen extends StatefulWidget {
  final String orderNumber;
  const OrderDetailScreen({super.key, required this.orderNumber});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  OrderDetail? _order;
  bool _showTicketForm = false;
  bool _ticketSent = false;
  final _ticketCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    ApiService.instance.orderDetail(widget.orderNumber).then((o) => setState(() => _order = o));
  }

  Future<void> _submitTicket() async {
    await ApiService.instance.openSupportTicket('Return/refund request — ${widget.orderNumber}', _ticketCtrl.text);
    setState(() => _ticketSent = true);
  }

  @override
  Widget build(BuildContext context) {
    final o = _order;
    if (o == null) {
      return Scaffold(appBar: AppBar(title: const Text('Order')), body: const Center(child: CircularProgressIndicator()));
    }
    final stepIndex = _steps.indexOf(o.status).clamp(0, _steps.length - 1);

    return Scaffold(
      appBar: AppBar(title: Text(o.orderNumber)),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (o.status != 'cancelled')
            Row(
              children: List.generate(_steps.length * 2 - 1, (i) {
                if (i.isOdd) {
                  final idx = i ~/ 2;
                  return Expanded(
                    child: Container(height: 2, color: idx < stepIndex ? AppColors.ink : AppColors.line),
                  );
                }
                final idx = i ~/ 2;
                return Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: idx <= stepIndex ? AppColors.ink : AppColors.line,
                  ),
                );
              }),
            ),
          const SizedBox(height: 12),
          Text('Status: ${o.status.replaceAll('_', ' ')}', style: const TextStyle(fontWeight: FontWeight.w700)),
          const Divider(height: 32),
          ...o.items.map((item) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text('${item.productName} × ${item.quantity}')),
                    Text(formatKES((double.parse(item.unitPrice) * item.quantity).toStringAsFixed(2))),
                  ],
                ),
              )),
          const Divider(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
              Text(formatKES(o.total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 20),
          Text('Delivery details', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 6),
          Text(o.shippingName),
          Text('${o.shippingAddress}, ${o.shippingCity}'),
          Text('Payment: ${o.paymentMethod}'),
          const SizedBox(height: 28),
          if (_ticketSent)
            const Text("Your return/refund request has been sent to support.", style: TextStyle(color: Colors.grey))
          else if (_showTicketForm) ...[
            TextField(
              controller: _ticketCtrl,
              maxLines: 3,
              decoration: const InputDecoration(hintText: "Tell us what you'd like to return and why…"),
            ),
            const SizedBox(height: 10),
            ElevatedButton(onPressed: _submitTicket, child: const Text('Submit request')),
          ] else
            OutlinedButton(
              onPressed: () => setState(() => _showTicketForm = true),
              child: const Text('Request a return or refund'),
            ),
        ],
      ),
    );
  }
}
