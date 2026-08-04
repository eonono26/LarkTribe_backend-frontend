import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../widgets/product_card.dart';
import 'product_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  List<ProductListItem> _results = [];
  String? _correctedQuery;
  bool _loading = false;
  bool _searched = false;

  Future<void> _search(String q) async {
    if (q.trim().isEmpty) return;
    setState(() {
      _loading = true;
      _searched = true;
    });
    ApiService.instance.track('search', extra: {'search_query': q});
    final (usedQuery, corrected, results) = await ApiService.instance.smartSearch(q);
    setState(() {
      _results = results;
      _correctedQuery = corrected ? usedQuery : null;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search dresses, skincare, baby gear…',
            border: InputBorder.none,
          ),
          onSubmitted: _search,
        ),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () => _search(_controller.text)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : !_searched
              ? const Center(child: Text('Search the whole duka catalog.', style: TextStyle(color: Colors.grey)))
              : Column(
                  children: [
                    if (_correctedQuery != null)
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          'Showing results for "$_correctedQuery" (smart search corrected your spelling).',
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ),
                    Expanded(
                      child: _results.isEmpty
                          ? const Center(child: Text('No products matched your search.', style: TextStyle(color: Colors.grey)))
                          : GridView.builder(
                              padding: const EdgeInsets.all(12),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                mainAxisSpacing: 12,
                                crossAxisSpacing: 12,
                                childAspectRatio: 0.62,
                              ),
                              itemCount: _results.length,
                              itemBuilder: (context, i) {
                                final p = _results[i];
                                return ProductCard(
                                  product: p,
                                  onTap: () => Navigator.push(
                                    context,
                                    MaterialPageRoute(builder: (_) => ProductDetailScreen(slug: p.slug)),
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
