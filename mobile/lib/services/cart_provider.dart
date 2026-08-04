import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class CartProvider extends ChangeNotifier {
  Cart? _cart;
  bool _isLoading = true;

  Cart? get cart => _cart;
  bool get isLoading => _isLoading;
  int get itemCount => _cart?.itemCount ?? 0;

  Future<void> refresh() async {
    try {
      _cart = await ApiService.instance.getCart();
    } catch (_) {
      // backend unreachable; leave previous state
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addItem(int productId, {int quantity = 1}) async {
    _cart = await ApiService.instance.addToCart(productId, quantity: quantity);
    notifyListeners();
  }

  Future<void> updateItem(int itemId, int quantity) async {
    _cart = await ApiService.instance.updateCartItem(itemId, quantity);
    notifyListeners();
  }

  Future<void> removeItem(int itemId) async {
    _cart = await ApiService.instance.removeCartItem(itemId);
    notifyListeners();
  }
}
