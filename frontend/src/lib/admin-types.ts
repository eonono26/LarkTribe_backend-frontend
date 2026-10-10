export interface Page<T> { count: number; next: string | null; previous: string | null; results: T[] }

export type ProductImageView = 'front' | 'back' | 'side' | 'detail' | 'other';
// Photos belong to a colour gallery: `view` = angle shown, `order` = position inside the colour's gallery,
// `is_primary` = the colour's lead photo (one per colour; '' colour = general shots).
export interface ProductImage { id: number; url: string | null; alt_text: string; color: string; view: ProductImageView; view_display?: string; is_primary: boolean; order: number }
export interface ProductVariant { id: number; size: string; color: string; stock: number; sku_suffix: string }
export interface AdminProduct {
  id: number; vendor: number; vendor_name: string; category: number; category_name: string; department_name: string;
  brand: number | null; brand_name: string | null; age_groups: number[]; gender: 'girls' | 'boys' | 'unisex';
  name: string; slug: string; description: string; features: string[]; materials: string; care_instructions: string;
  price: string; compare_at_price: string | null; discount_percent: number; stock: number; sku: string;
  status: 'draft' | 'pending' | 'active' | 'rejected'; is_featured: boolean; rating_avg: string; rating_count: number;
  created_at: string; updated_at: string; primary_image: string | null; images: ProductImage[]; variants: ProductVariant[];
}
export interface MediaItem { id: number; file: string | null; media_type: 'image' | 'video'; alt_text: string; is_primary: boolean; order: number }
export interface Department { id: number; name: string; slug: string; order: number; description: string; is_active: boolean; category_count: number; product_count: number; media: MediaItem[]; image_url: string | null }
export interface Category { id: number; department: number; department_name: string; parent: number | null; parent_name: string | null; name: string; slug: string; order: number; description: string; is_active: boolean; product_count: number; media: MediaItem[]; image_url: string | null }
export interface Brand { id: number; name: string; slug: string; logo_url: string | null; description: string; website: string; is_active: boolean; product_count: number; media: MediaItem[]; image_url: string | null }
export interface AgeGroup { id: number; name: string; slug: string; stage: 'baby' | 'kids' | 'teens'; min_age_years: string; max_age_years: string; icon: string; order: number; is_active: boolean; product_count: number; media: MediaItem[]; image_url: string | null }

export interface OrderItem { id: number; product: number; product_name: string; product_image: string | null; product_slug: string | null; variant_label: string; unit_price: string; quantity: number; subtotal: string; fulfillment_status: string }
export interface AdminOrder {
  id: number; order_number: string; status: string; status_display: string; payment_method: string; payment_method_display: string;
  subtotal: string; shipping_fee: string; discount_total: string; member_discount_total: string; total: string;
  shipping_name: string; shipping_phone: string; shipping_address: string; shipping_city: string; coupon_code: string; mpesa_receipt: string;
  guest_email: string | null; customer: { id: number | null; username: string | null; name: string; email: string; is_guest: boolean };
  items?: OrderItem[]; items_count: number; created_at: string; updated_at: string;
}
export interface AdminUser {
  id: number; username: string; email: string; first_name: string; last_name: string; phone: string;
  role: 'customer' | 'vendor' | 'driver' | 'admin'; is_active: boolean; is_staff: boolean; date_joined: string;
  last_login: string | null; orders_count: number; profile_picture_url: string | null;
}
export interface Vendor { id: number; username: string; store_name: string; slug: string; description: string; logo: string | null; status: 'pending' | 'approved' | 'suspended'; commission_rate: string; created_at: string }
export interface Coupon { id: number; code: string; percent_off: number | null; amount_off: string | null; active: boolean; valid_until: string | null; is_public: boolean }
export interface Campaign {
  id: number; title: string; description: string; placement: string; style: string; background_color: string; cta_label: string;
  image: string | null; link_url: string; department: number | null; coupon: number | null; is_ai_generated: boolean; active: boolean;
  starts_at: string; ends_at: string | null; is_live: boolean; created_at: string;
}
export interface ShowcaseVideo { id: number; title: string; video_url: string | null; thumbnail_url: string | null; cta_label: string; link_url: string; product: number | null; department: number | null; order: number; active: boolean; created_at: string }
export interface TicketReply { id: number; author_name: string; is_staff_reply: boolean; message: string; created_at: string }
export interface Ticket { id: number; user_name: string; order: number | null; subject: string; message: string; status: 'open' | 'in_progress' | 'resolved' | 'closed'; created_at: string; updated_at: string; replies: TicketReply[] }
export interface Driver { id: number; name: string; email: string; phone: string; vehicle_type: string; vehicle_plate: string; is_active: boolean; is_online: boolean; active_delivery_count: number; rating_avg: string }
export interface Delivery {
  id: number; order_number: string; order_total: string; shipping_name: string; shipping_phone: string; shipping_city: string;
  status: string; driver: Driver | null; item_count: number; dropoff_label: string; created_at: string;
}

export interface Lookups {
  vendors: { id: number; store_name: string; status: string }[];
  departments: { id: number; name: string }[];
  categories: { id: number; name: string; label: string; department: number; parent: number | null }[];
  brands: { id: number; name: string }[];
  age_groups: { id: number; name: string; stage: string }[];
  product_statuses: { value: string; label: string }[];
  genders: { value: string; label: string }[];
  order_statuses: { value: string; label: string }[];
  payment_methods: { value: string; label: string }[];
  roles: { value: string; label: string }[];
}
export interface Overview {
  range_days: number; revenue: number; revenue_change: number | null; orders: number; orders_change: number | null;
  new_customers: number; new_customers_change: number | null; avg_order_value: number;
  sales_by_day: { date: string; orders: number; revenue: number }[];
  orders_by_status: Record<string, number>;
  sales_by_department: { name: string | null; revenue: number; units: number }[];
  recent_orders: AdminOrder[];
  low_stock: { id: number; name: string; sku: string; stock: number; image: string | null }[];
  totals: { products: number; active_products: number; pending_products: number; customers: number; vendors: number; pending_vendors: number; open_tickets: number };
}
