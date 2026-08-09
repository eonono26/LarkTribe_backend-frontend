export interface DepartmentMedia {
  id: number;
  file: string;
  file_url: string;
  media_type: 'image' | 'video';
  alt_text: string;
  is_primary: boolean;
  order: number;
  uploaded_at: string;
}

export interface CategoryMedia {
  id: number;
  file: string;
  file_url: string;
  media_type: 'image' | 'video';
  alt_text: string;
  is_primary: boolean;
  order: number;
  uploaded_at: string;
}

export interface Department {
  id: number;
  name: string;
  slug: string;
  description?: string;
  order: number;
  is_active: boolean;
  media_files: DepartmentMedia[];
  primary_image: DepartmentMedia | null;
  images: DepartmentMedia[];
  videos: DepartmentMedia[];
  category_count: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  department: Department;
  parent: number | null;
  name: string;
  slug: string;
  order: number;
  description?: string;
  is_active: boolean;
  media_files: CategoryMedia[];
  primary_image: CategoryMedia | null;
  images: CategoryMedia[];
  videos: CategoryMedia[];
  child_count: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: number;
  name: string;
  slug: string;
  price: string;
  compare_at_price: string | null;
  discount_percent: number;
  rating_avg: string;
  rating_count: number;
  image: string | null;
  vendor_name: string;
  is_featured: boolean;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  order: number;
}

export interface ProductVariant {
  id: number;
  size: string;
  color: string;
  stock: number;
}

export interface Review {
  id: number;
  user: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ProductDetail extends Omit<ProductListItem, "image"> {
  description: string;
  stock: number;
  sku: string;
  status: string;
  category: Category;
  brand: { id: number; name: string; slug: string } | null;
  images: ProductImage[];
  variants: ProductVariant[];
  reviews: Review[];
  created_at: string;
}

export interface CartItem {
  id: number;
  product: ProductListItem;
  variant: number | null;
  quantity: number;
  subtotal: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Wishlist {
  id: number;
  product: ProductListItem;
  created_at: string;
}

export interface Notification {
  id: number;
  channel: "push" | "email" | "in_app";
  category: "order" | "promotion" | "recommendation" | "vendor" | "system" | "support";
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  sent_at: string;
}

export interface SupportReply {
  id: number;
  author_name: string;
  is_staff_reply: boolean;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  user_name: string;
  order: number | null;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  replies: SupportReply[];
}

export interface ChatReply {
  session_id: number;
  reply: {
    id: number;
    sender: "user" | "bot";
    text: string;
    products: ProductListItem[];
    created_at: string;
  };
}

export interface CustomerSegment {
  id: number;
  username: string;
  segment: "vip" | "loyal" | "new" | "at_risk" | "churned" | "low_value";
  recency_days: number;
  frequency: number;
  monetary: string;
  churn_risk_score: number;
  updated_at: string;
}

export interface Coupon {
  id: number;
  code: string;
  percent_off: number | null;
  amount_off: string | null;
  active: boolean;
  valid_until: string | null;
}

export interface Campaign {
  id: number;
  title: string;
  description: string;
  placement: string;
  style: "hero" | "strip" | "split" | "countdown" | "card";
  background_color: string;
  cta_label: string;
  image: string | null;
  link_url: string;
  department: number | null;
  coupon: number | null;
  is_ai_generated: boolean;
  active: boolean;
  starts_at: string;
  ends_at: string | null;
  is_live: boolean;
  created_at: string;
}

export interface AdminVendor {
  id: number;
  username: string;
  store_name: string;
  slug: string;
  description: string;
  logo: string | null;
  status: "pending" | "approved" | "suspended";
  commission_rate: string;
  created_at: string;
}

export interface AdminReports {
  range_days: number;
  orders: number;
  revenue: number;
  new_users: number;
  active_vendors: number;
  pending_vendors: number;
  products_pending_moderation: number;
  top_products: { product__id: number; product__name: string; units_sold: number; revenue: number }[];
  conversion_funnel: Record<string, number>;
  open_support_tickets: number;
}

export interface ShowcaseVideoItem {
  id: number;
  title: string;
  video: string;
  video_url: string | null;
  thumbnail: string | null;
  thumbnail_url: string | null;
  cta_label: string;
  link_url: string;
  product: number | null;
  product_slug: string | null;
  department: number | null;
  department_slug: string | null;
  resolved_link: string | null;
  order: number;
  active: boolean;
  created_at: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  product_count: number;
}

export interface AIDashboard {
  customer_segments: Record<string, number>;
  at_risk_customers: CustomerSegment[];
  sales_forecast: { weekly_revenue_history: number[]; projected_next_week_revenue: number };
  flagged_orders: { id: number; order_number: string; risk_score: number; reasons: string[]; flagged: boolean; reviewed: boolean; created_at: string }[];
  marketing_suggestions: { type: string; title: string; detail: string; suggested_action: string }[];
}
