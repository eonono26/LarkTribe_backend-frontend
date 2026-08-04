import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<AppNotification> _items = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final items = await ApiService.instance.notifications();
    if (mounted) setState(() {
      _items = items;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items.any((n) => !n.isRead);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (hasUnread)
            TextButton(
              onPressed: () async {
                await ApiService.instance.markAllNotificationsRead();
                _load();
              },
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const Center(child: Text("You're all caught up.", style: TextStyle(color: Colors.grey)))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    final n = _items[i];
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: n.isRead ? Colors.white : AppColors.mist,
                        border: Border.all(color: AppColors.line),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(n.category.toUpperCase(),
                              style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 4),
                          Text(n.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                          if (n.body.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(n.body, style: const TextStyle(color: Colors.black87, fontSize: 13)),
                          ],
                        ],
                      ),
                    );
                  },
                ),
    );
  }
}
