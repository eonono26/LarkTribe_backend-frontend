import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/cart_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/product_card.dart';
import '../widgets/product_row.dart';
import '../widgets/chatbot_sheet.dart';
import 'category_screen.dart';
import 'product_detail_screen.dart';
import 'cart_screen.dart';
import 'search_screen.dart';
import 'wishlist_screen.dart';
import 'orders_screen.dart';
import 'notifications_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Department> _departments = [];
  List<ProductListItem> _products = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    context.read<CartProvider>().refresh();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.instance.departments(),
        ApiService.instance.products(),
      ]);
      setState(() {
        _departments = results[0] as List<Department>;
        _products = results[1] as List<ProductListItem>;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final itemCount = context.watch<CartProvider>().itemCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('duka', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22)),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SearchScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.favorite_border),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_none),
            onPressed: () async {
              if (!ApiService.instance.isLoggedIn) {
                final signedIn = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                if (signedIn != true) return;
              }
              if (context.mounted) {
                Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
              }
            },
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_bag_outlined),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
              ),
              if (itemCount > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(color: AppColors.flag, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text('$itemCount',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: AppColors.ink),
              child: Text('duka', style: TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('My orders'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.favorite_border),
              title: const Text('Wishlist'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.notifications_none),
              title: const Text('Notifications'),
              onTap: () async {
                Navigator.pop(context);
                if (!ApiService.instance.isLoggedIn) {
                  final signedIn = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                  if (signedIn != true) return;
                }
                if (context.mounted) {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
                }
              },
            ),
            const Divider(),
            ListTile(
              leading: Icon(ApiService.instance.isLoggedIn ? Icons.logout : Icons.login),
              title: Text(ApiService.instance.isLoggedIn ? 'Sign out' : 'Sign in'),
              onTap: () async {
                Navigator.pop(context);
                if (ApiService.instance.isLoggedIn) {
                  await ApiService.instance.logout();
                  setState(() {});
                } else {
                  await Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                  setState(() {});
                }
              },
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showChatbotSheet(context),
        backgroundColor: AppColors.ink,
        child: const Icon(Icons.chat_bubble_outline, color: Colors.white),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  Container(
                    width: double.infinity,
                    color: AppColors.signal,
                    padding: const EdgeInsets.all(20),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('NAIROBI · KENYA-WIDE DELIVERY',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.6)),
                        SizedBox(height: 8),
                        Text(
                          'Everything for her, the kids, and home.',
                          style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900, height: 1.05),
                        ),
                        SizedBox(height: 8),
                        Text('Hundreds of independent Kenyan sellers. Pay with M-Pesa, card, or cash on delivery.',
                            style: TextStyle(fontSize: 13)),
                      ],
                    ),
                  ),
                  SizedBox(
                    height: 96,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.all(12),
                      itemCount: _departments.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, i) {
                        final d = _departments[i];
                        final color = AppColors.departmentColor(d.slug);
                        return GestureDetector(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => CategoryScreen(department: d)),
                          ),
                          child: Container(
                            width: 96,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              border: Border.all(color: AppColors.line),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(width: 28, height: 6, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4))),
                                const SizedBox(height: 8),
                                Text(d.name, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Text('Just landed', style: Theme.of(context).textTheme.titleLarge),
                  ),
                  _products.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(24),
                          child: Text(
                            'No products yet — seed demo data on the backend or add products from the vendor dashboard.',
                            style: TextStyle(color: Colors.grey),
                          ),
                        )
                      : GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 0.62,
                          ),
                          itemCount: _products.length,
                          itemBuilder: (context, i) {
                            final p = _products[i];
                            return ProductCard(
                              product: p,
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => ProductDetailScreen(slug: p.slug)),
                              ),
                            );
                          },
                        ),
                  ProductRow(title: 'Recommended for you', fetcher: () => ApiService.instance.recommendedForYou()),
                  const SizedBox(height: 24),
                ],
              ),
            ),
    );
  }
}
