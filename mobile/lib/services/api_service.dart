import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/models.dart';

/// Change this to your deployed backend URL, or override at build time with
/// --dart-define=API_BASE_URL=https://api.yourdomain.com/api
const _defaultBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000/api', // 10.0.2.2 = Android emulator's localhost
);

class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  final String baseUrl = _defaultBaseUrl;
  final _secureStorage = const FlutterSecureStorage();
  String? _sessionCookie; // guest cart session, mirrors the web app's cookie-based cart
  String? _accessToken; // member login JWT

  Future<void> _loadPersisted() async {
    final prefs = await SharedPreferences.getInstance();
    _sessionCookie ??= prefs.getString('session_cookie');
    _accessToken ??= await _secureStorage.read(key: 'access_token');
  }

  Future<void> _persistCookie(http.Response res) async {
    final setCookie = res.headers['set-cookie'];
    if (setCookie != null) {
      final cookie = setCookie.split(';').first;
      _sessionCookie = cookie;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('session_cookie', cookie);
    }
  }

  Future<Map<String, String>> _headers({bool json = true}) async {
    await _loadPersisted();
    return {
      if (json) 'Content-Type': 'application/json',
      if (_sessionCookie != null) 'Cookie': _sessionCookie!,
      if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
    };
  }

  Uri _u(String path, [Map<String, String>? query]) =>
      Uri.parse('$baseUrl$path').replace(queryParameters: query);

  // ---- Catalog ----

  Future<List<Department>> departments() async {
    final res = await http.get(_u('/catalog/departments/'), headers: await _headers());
    final data = jsonDecode(res.body);
    return (data['results'] as List).map((d) => Department.fromJson(d)).toList();
  }

  Future<List<ProductListItem>> products({String? departmentSlug, String? search}) async {
    final query = <String, String>{
      if (departmentSlug != null) 'category__department__slug': departmentSlug,
      if (search != null && search.isNotEmpty) 'search': search,
    };
    final res = await http.get(_u('/catalog/products/', query), headers: await _headers());
    final data = jsonDecode(res.body);
    return (data['results'] as List).map((p) => ProductListItem.fromJson(p)).toList();
  }

  Future<ProductDetail> product(String slug) async {
    final res = await http.get(_u('/catalog/products/$slug/'), headers: await _headers());
    return ProductDetail.fromJson(jsonDecode(res.body));
  }

  // ---- Cart ----

  Future<Cart> getCart() async {
    final res = await http.get(_u('/cart/'), headers: await _headers());
    await _persistCookie(res);
    return Cart.fromJson(jsonDecode(res.body));
  }

  Future<Cart> addToCart(int productId, {int quantity = 1}) async {
    final res = await http.post(
      _u('/cart/items/'),
      headers: await _headers(),
      body: jsonEncode({'product_id': productId, 'quantity': quantity}),
    );
    await _persistCookie(res);
    return Cart.fromJson(jsonDecode(res.body));
  }

  Future<Cart> updateCartItem(int itemId, int quantity) async {
    final res = await http.patch(
      _u('/cart/items/$itemId/'),
      headers: await _headers(),
      body: jsonEncode({'quantity': quantity}),
    );
    return Cart.fromJson(jsonDecode(res.body));
  }

  Future<Cart> removeCartItem(int itemId) async {
    final res = await http.delete(_u('/cart/items/$itemId/'), headers: await _headers());
    return Cart.fromJson(jsonDecode(res.body));
  }

  // ---- Auth ----

  /// Returns true on success. Used by the member-login side of the
  /// checkout toggle (mirrors the web app's Member Login / Guest Checkout UX).
  Future<bool> login(String username, String password) async {
    final res = await http.post(
      _u('/auth/login/'),
      headers: await _headers(),
      body: jsonEncode({'username': username, 'password': password}),
    );
    if (res.statusCode != 200) return false;
    final data = jsonDecode(res.body);
    _accessToken = data['access'];
    await _secureStorage.write(key: 'access_token', value: _accessToken);
    await _secureStorage.write(key: 'refresh_token', value: data['refresh']);
    return true;
  }

  Future<void> logout() async {
    _accessToken = null;
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
  }

  bool get isLoggedIn => _accessToken != null;

  Future<void> _storeTokens(Map<String, dynamic> data) async {
    _accessToken = data['access'];
    await _secureStorage.write(key: 'access_token', value: _accessToken);
    await _secureStorage.write(key: 'refresh_token', value: data['refresh']);
  }

  /// Registration & Login (Email): creates an account, then logs in.
  Future<String?> register({
    required String username,
    required String email,
    required String password,
    String firstName = '',
    String lastName = '',
    String phone = '',
  }) async {
    final res = await http.post(
      _u('/auth/register/'),
      headers: await _headers(),
      body: jsonEncode({
        'username': username,
        'email': email,
        'password': password,
        'first_name': firstName,
        'last_name': lastName,
        'phone': phone,
      }),
    );
    if (res.statusCode >= 400) return "Couldn't create your account — check your details and try again.";
    final ok = await login(username, password);
    return ok ? null : "Account created — please sign in.";
  }

  /// Registration & Login (Google/Apple): send the provider's id_token, get a JWT pair back.
  Future<bool> socialLogin(String provider, String idToken) async {
    final res = await http.post(
      _u('/auth/social/'),
      headers: await _headers(),
      body: jsonEncode({'provider': provider, 'id_token': idToken}),
    );
    if (res.statusCode != 200) return false;
    await _storeTokens(jsonDecode(res.body));
    return true;
  }

  /// Registration & Login (Phone), step 1: request an OTP. Returns the debug
  /// code in local/dev builds (backend DEBUG=True) for easy testing.
  Future<String?> requestPhoneOTP(String phone) async {
    final res = await http.post(
      _u('/auth/phone/request-otp/'),
      headers: await _headers(),
      body: jsonEncode({'phone': phone}),
    );
    if (res.statusCode != 200) return null;
    final data = jsonDecode(res.body);
    return data['debug_code'] as String?;
  }

  /// Registration & Login (Phone), step 2: verify the OTP and sign in.
  Future<bool> verifyPhoneOTP(String phone, String code) async {
    final res = await http.post(
      _u('/auth/phone/verify-otp/'),
      headers: await _headers(),
      body: jsonEncode({'phone': phone, 'code': code}),
    );
    if (res.statusCode != 200) return false;
    await _storeTokens(jsonDecode(res.body));
    return true;
  }

  // ---- Wishlist ----

  Future<List<WishlistItem>> wishlist() async {
    final res = await http.get(_u('/catalog/wishlist/'), headers: await _headers());
    final data = jsonDecode(res.body);
    final list = data is List ? data : data['results'];
    return (list as List).map((w) => WishlistItem.fromJson(w)).toList();
  }

  Future<WishlistItem> addToWishlist(int productId) async {
    final res = await http.post(
      _u('/catalog/wishlist/'),
      headers: await _headers(),
      body: jsonEncode({'product_id': productId}),
    );
    return WishlistItem.fromJson(jsonDecode(res.body));
  }

  Future<void> removeFromWishlist(int wishlistItemId) async {
    await http.delete(_u('/catalog/wishlist/$wishlistItemId/'), headers: await _headers());
  }

  // ---- Reviews ----

  Future<List<Review>> reviews(int productId) async {
    final res = await http.get(_u('/catalog/products/$productId/reviews/'), headers: await _headers());
    final data = jsonDecode(res.body);
    final list = data is List ? data : data['results'];
    return (list as List).map((r) => Review.fromJson(r)).toList();
  }

  Future<bool> addReview(int productId, int rating, String comment) async {
    final res = await http.post(
      _u('/catalog/products/$productId/reviews/'),
      headers: await _headers(),
      body: jsonEncode({'rating': rating, 'comment': comment}),
    );
    return res.statusCode == 201;
  }

  // ---- AI ----

  Future<List<ProductListItem>> recommendedForYou() async {
    final res = await http.get(_u('/ai/recommended-for-you/'), headers: await _headers());
    final data = jsonDecode(res.body) as List;
    return data.map((p) => ProductListItem.fromJson(p)).toList();
  }

  Future<List<ProductListItem>> similarProducts(int productId) async {
    final res = await http.get(_u('/ai/products/$productId/similar/'), headers: await _headers());
    final data = jsonDecode(res.body) as List;
    return data.map((p) => ProductListItem.fromJson(p)).toList();
  }

  Future<List<ProductListItem>> frequentlyBoughtTogether(int productId) async {
    final res = await http.get(_u('/ai/products/$productId/frequently-bought-together/'), headers: await _headers());
    final data = jsonDecode(res.body) as List;
    return data.map((p) => ProductListItem.fromJson(p)).toList();
  }

  /// Smart search with typo correction. Returns (usedQuery, wasCorrected, results).
  Future<(String, bool, List<ProductListItem>)> smartSearch(String q) async {
    final res = await http.get(_u('/ai/search/', {'q': q}), headers: await _headers());
    final data = jsonDecode(res.body);
    final results = (data['results'] as List).map((p) => ProductListItem.fromJson(p)).toList();
    return (data['used_query'] as String, data['corrected'] as bool, results);
  }

  int? _chatSessionId;

  Future<ChatMessage> chatbot(String message) async {
    final res = await http.post(
      _u('/ai/chatbot/'),
      headers: await _headers(),
      body: jsonEncode({'message': message, 'session_id': _chatSessionId}),
    );
    final data = jsonDecode(res.body);
    _chatSessionId = data['session_id'];
    return ChatMessage.fromBotReply(data['reply']);
  }

  // ---- Promotions ----

  Future<(bool, double, String?)> validateCoupon(String code, double subtotal) async {
    final res = await http.post(
      _u('/promotions/validate-coupon/'),
      headers: await _headers(),
      body: jsonEncode({'code': code, 'subtotal': subtotal}),
    );
    final data = jsonDecode(res.body);
    if (data['valid'] == true) {
      return (true, (data['discount'] as num).toDouble(), null);
    }
    return (false, 0.0, data['detail'] as String?);
  }

  // ---- Notifications ----

  Future<List<AppNotification>> notifications() async {
    final res = await http.get(_u('/notifications/inbox/'), headers: await _headers());
    final data = jsonDecode(res.body);
    final list = data is List ? data : data['results'];
    return (list as List).map((n) => AppNotification.fromJson(n)).toList();
  }

  Future<void> markAllNotificationsRead() async {
    await http.post(_u('/notifications/inbox/mark-all-read/'), headers: await _headers());
  }

  // ---- Support ----

  Future<SupportTicket> openSupportTicket(String subject, String message) async {
    final res = await http.post(
      _u('/notifications/support-tickets/'),
      headers: await _headers(),
      body: jsonEncode({'subject': subject, 'message': message}),
    );
    return SupportTicket.fromJson(jsonDecode(res.body));
  }

  // ---- Orders ----

  Future<List<OrderSummary>> myOrders() async {
    final res = await http.get(_u('/orders/mine/'), headers: await _headers());
    final data = jsonDecode(res.body);
    final list = data is List ? data : data['results'];
    return (list as List).map((o) => OrderSummary.fromJson(o)).toList();
  }

  Future<OrderDetail> orderDetail(String orderNumber) async {
    final res = await http.get(_u('/orders/$orderNumber/'), headers: await _headers());
    return OrderDetail.fromJson(jsonDecode(res.body));
  }

  // ---- Behavior tracking (fire-and-forget) ----

  Future<void> track(String eventType, {Map<String, dynamic> extra = const {}}) async {
    try {
      await http.post(
        _u('/analytics/track/'),
        headers: await _headers(),
        body: jsonEncode({'event_type': eventType, ...extra}),
      );
    } catch (_) {
      // best-effort only
    }
  }

  // ---- Checkout ----

  Future<Map<String, dynamic>> checkout({
    String? guestEmail,
    required String paymentMethod,
    required String shippingName,
    required String shippingPhone,
    required String shippingAddress,
    required String shippingCity,
    String couponCode = '',
  }) async {
    final res = await http.post(
      _u('/orders/checkout/'),
      headers: await _headers(),
      body: jsonEncode({
        if (guestEmail != null) 'guest_email': guestEmail,
        'payment_method': paymentMethod,
        'shipping_name': shippingName,
        'shipping_phone': shippingPhone,
        'shipping_address': shippingAddress,
        'shipping_city': shippingCity,
        'coupon_code': couponCode,
      }),
    );
    if (res.statusCode != 201) {
      throw Exception('Checkout failed: ${res.body}');
    }
    return jsonDecode(res.body);
  }
}
