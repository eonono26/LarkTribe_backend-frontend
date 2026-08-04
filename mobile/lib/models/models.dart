class Department {
  final int id;
  final String name;
  final String slug;

  Department({required this.id, required this.name, required this.slug});

  factory Department.fromJson(Map<String, dynamic> json) => Department(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
      );
}

class ProductListItem {
  final int id;
  final String name;
  final String slug;
  final String price;
  final String? compareAtPrice;
  final int discountPercent;
  final String ratingAvg;
  final int ratingCount;
  final String? image;
  final String vendorName;

  ProductListItem({
    required this.id,
    required this.name,
    required this.slug,
    required this.price,
    this.compareAtPrice,
    required this.discountPercent,
    required this.ratingAvg,
    required this.ratingCount,
    this.image,
    required this.vendorName,
  });

  factory ProductListItem.fromJson(Map<String, dynamic> json) => ProductListItem(
        id: json['id'],
        name: json['name'],
        slug: json['slug'],
        price: json['price'],
        compareAtPrice: json['compare_at_price'],
        discountPercent: json['discount_percent'] ?? 0,
        ratingAvg: json['rating_avg'] ?? '0.00',
        ratingCount: json['rating_count'] ?? 0,
        image: json['image'],
        vendorName: json['vendor_name'] ?? '',
      );
}

class ProductDetail extends ProductListItem {
  final String description;
  final int stock;
  final List<String> images;

  ProductDetail({
    required super.id,
    required super.name,
    required super.slug,
    required super.price,
    super.compareAtPrice,
    required super.discountPercent,
    required super.ratingAvg,
    required super.ratingCount,
    required super.vendorName,
    required this.description,
    required this.stock,
    required this.images,
  }) : super(image: images.isNotEmpty ? images.first : null);

  factory ProductDetail.fromJson(Map<String, dynamic> json) {
    final images = (json['images'] as List<dynamic>? ?? [])
        .map((i) => i['image'] as String)
        .toList();
    return ProductDetail(
      id: json['id'],
      name: json['name'],
      slug: json['slug'],
      price: json['price'],
      compareAtPrice: json['compare_at_price'],
      discountPercent: json['discount_percent'] ?? 0,
      ratingAvg: json['rating_avg'] ?? '0.00',
      ratingCount: json['rating_count'] ?? 0,
      vendorName: json['vendor_name'] ?? '',
      description: json['description'] ?? '',
      stock: json['stock'] ?? 0,
      images: images,
    );
  }
}

class CartItem {
  final int id;
  final ProductListItem product;
  final int quantity;
  final String subtotal;

  CartItem({required this.id, required this.product, required this.quantity, required this.subtotal});

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'],
        product: ProductListItem.fromJson(json['product']),
        quantity: json['quantity'],
        subtotal: json['subtotal'].toString(),
      );
}

class Cart {
  final int id;
  final List<CartItem> items;
  final String total;

  Cart({required this.id, required this.items, required this.total});

  factory Cart.fromJson(Map<String, dynamic> json) => Cart(
        id: json['id'],
        items: (json['items'] as List<dynamic>).map((i) => CartItem.fromJson(i)).toList(),
        total: json['total'].toString(),
      );

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);
}

class Review {
  final int id;
  final String user;
  final int rating;
  final String comment;
  final String createdAt;

  Review({required this.id, required this.user, required this.rating, required this.comment, required this.createdAt});

  factory Review.fromJson(Map<String, dynamic> json) => Review(
        id: json['id'],
        user: json['user'] ?? '',
        rating: json['rating'],
        comment: json['comment'] ?? '',
        createdAt: json['created_at'] ?? '',
      );
}

class WishlistItem {
  final int id;
  final ProductListItem product;

  WishlistItem({required this.id, required this.product});

  factory WishlistItem.fromJson(Map<String, dynamic> json) => WishlistItem(
        id: json['id'],
        product: ProductListItem.fromJson(json['product']),
      );
}

class AppNotification {
  final int id;
  final String channel;
  final String category;
  final String title;
  final String body;
  final String link;
  final bool isRead;
  final String sentAt;

  AppNotification({
    required this.id,
    required this.channel,
    required this.category,
    required this.title,
    required this.body,
    required this.link,
    required this.isRead,
    required this.sentAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'],
        channel: json['channel'] ?? 'in_app',
        category: json['category'] ?? 'system',
        title: json['title'] ?? '',
        body: json['body'] ?? '',
        link: json['link'] ?? '',
        isRead: json['is_read'] ?? false,
        sentAt: json['sent_at'] ?? '',
      );
}

class ChatMessage {
  final int? id;
  final String sender; // 'user' or 'bot'
  final String text;
  final List<ProductListItem> products;

  ChatMessage({this.id, required this.sender, required this.text, this.products = const []});

  factory ChatMessage.fromBotReply(Map<String, dynamic> json) => ChatMessage(
        id: json['id'],
        sender: json['sender'] ?? 'bot',
        text: json['text'] ?? '',
        products: (json['products'] as List<dynamic>? ?? [])
            .map((p) => ProductListItem.fromJson(p))
            .toList(),
      );
}

class SupportTicket {
  final int id;
  final String subject;
  final String message;
  final String status;
  final String createdAt;

  SupportTicket({required this.id, required this.subject, required this.message, required this.status, required this.createdAt});

  factory SupportTicket.fromJson(Map<String, dynamic> json) => SupportTicket(
        id: json['id'],
        subject: json['subject'] ?? '',
        message: json['message'] ?? '',
        status: json['status'] ?? 'open',
        createdAt: json['created_at'] ?? '',
      );
}

class OrderSummary {
  final String orderNumber;
  final String status;
  final String total;
  final String createdAt;

  OrderSummary({required this.orderNumber, required this.status, required this.total, required this.createdAt});

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        orderNumber: json['order_number'],
        status: json['status'],
        total: json['total'].toString(),
        createdAt: json['created_at'] ?? '',
      );
}

class OrderItemDetail {
  final int id;
  final String productName;
  final int quantity;
  final String unitPrice;

  OrderItemDetail({required this.id, required this.productName, required this.quantity, required this.unitPrice});

  factory OrderItemDetail.fromJson(Map<String, dynamic> json) => OrderItemDetail(
        id: json['id'],
        productName: json['product_name'] ?? '',
        quantity: json['quantity'],
        unitPrice: json['unit_price'].toString(),
      );
}

class OrderDetail {
  final String orderNumber;
  final String status;
  final String total;
  final String shippingName;
  final String shippingAddress;
  final String shippingCity;
  final String paymentMethod;
  final String createdAt;
  final List<OrderItemDetail> items;

  OrderDetail({
    required this.orderNumber,
    required this.status,
    required this.total,
    required this.shippingName,
    required this.shippingAddress,
    required this.shippingCity,
    required this.paymentMethod,
    required this.createdAt,
    required this.items,
  });

  factory OrderDetail.fromJson(Map<String, dynamic> json) => OrderDetail(
        orderNumber: json['order_number'],
        status: json['status'],
        total: json['total'].toString(),
        shippingName: json['shipping_name'] ?? '',
        shippingAddress: json['shipping_address'] ?? '',
        shippingCity: json['shipping_city'] ?? '',
        paymentMethod: json['payment_method'] ?? '',
        createdAt: json['created_at'] ?? '',
        items: (json['items'] as List<dynamic>? ?? []).map((i) => OrderItemDetail.fromJson(i)).toList(),
      );
}
