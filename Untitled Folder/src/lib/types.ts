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

// In lib/types.ts - Add these types if they don't exist

export interface AgeGroupMedia {
  id: number;
  file: string;
  file_url: string;
  media_type: 'image' | 'video';
  alt_text: string;
  is_primary: boolean;
  order: number;
  uploaded_at: string;
}

// export interface AgeGroup {
//   id: number;
//   name: string;
//   slug: string;
//   min_age_years: number | null;
//   max_age_years: number | null;
//   icon: string;
//   order: number;
//   is_active: boolean;
//   media_files: AgeGroupMedia[];
//   primary_image: AgeGroupMedia | null;
//   images: AgeGroupMedia[];
//   videos: AgeGroupMedia[];
//   product_count: number;
//   created_at: string;
// }


export interface ProductListItem {
  id: string;
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
  images: ProductImage[];
  // colors: distinct variant colors for this product, in creation order.
  // color_images: color -> absolute image URL, populated only for colors
  // that have at least one color-tagged ProductImage. A color present in
  // `colors` but missing from `color_images` has no dedicated photo yet —
  // fall back to `image`/`image_url` for it.
  colors: string[];
  color_images: Record<string, string>;
  // color -> a representative ProductVariant id for that color (preferring
  // an in-stock one). Lets a grid card's swatches/"Quick Add" resolve a
  // real variant without opening the full product page.
  color_variant_ids?: Record<string, number>;
  // True when this product comes in sizes, so grid "Quick Add" must send the
  // shopper through Quick View to pick one instead of guessing.
  needs_size?: boolean;
  category_name: string;
  stock: number;
  status: string;
  image_url: string | null;
  age_groups: AgeGroup[];
  gender: "girls" | "boys" | "unisex";
  
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  // Which color variant this photo shows (matches ProductVariant.color),
  // or "" for a general/default shot not tied to a specific color.
  color: string;
  // Angle this photo shows. Photos of one color form that color's gallery.
  view: ProductImageView;
  view_display?: string;
  // The lead photo of its color (at most one per color) - always listed first.
  is_primary: boolean;
  // Position inside the color's gallery, lowest first.
  order: number;
}

export type ProductImageView = "front" | "back" | "side" | "detail" | "other";

// One color's ordered gallery as returned by the product detail endpoint:
// primary photo first, then the remaining views in display order.
// `color` is "" for the general (untagged) photos.
export interface ColorGallery {
  color: string;
  primary_image: ProductImage | null;
  images: ProductImage[];
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
  features?: string[];
  // Material composition shown under "Materials & Care" on the product
  // page, e.g. "Nylon, Rubber" — set by the vendor/admin per product.
  materials?: string;
  care_instructions?: string;
  size_guide?: SizeGuide | null;
  stock: number;
  sku: string;
  status: string;
  category: Category;
  brand: { id: number; name: string; slug: string } | null;
  images: ProductImage[];
  color_galleries?: ColorGallery[];
  variants: ProductVariant[];
  available_sizes: string[];
  reviews: Review[];
  created_at: string;
  gender: "girls" | "boys" | "unisex";
}

export interface SizeGuide {
  id: number;
  name: string;
  guide_type: "clothes" | "shoes" | "kids" | "accessories" | "other";
  columns: string[];
  rows: string[][];
  notes: string;
}

export interface CartItem {
  id: number;
  product: ProductListItem;
  // Full variant detail (color/size/stock) when the item was added with a
  // specific variant selected, so the cart drawer/checkout can show it.
  variant: ProductVariant | null;
  // Photo of the color the shopper picked (falls back to the first photo).
  image: string | null;
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

export interface WalletCoupon {
  id: number;
  code: string;
  percent_off: number | null;
  amount_off: string | null;
  valid_until: string | null;
  saved: boolean;
}

export interface CouponClaim {
  id: number;
  coupon: Coupon;
  claimed_at: string;
  used_at: string | null;
}

export interface Address {
  id: number;
  label: "home" | "work" | "other";
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  is_default: boolean;
  created_at: string;
}

export interface PaymentMethod {
  id: number;
  type: "card" | "mpesa";
  label: string;
  card_brand: string;
  card_last4: string;
  card_exp_month: number | null;
  card_exp_year: number | null;
  mpesa_phone: string;
  is_default: boolean;
  created_at: string;
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

export interface BrandMedia {
  id: number;
  file: string;
  file_url: string;
  media_type: 'image' | 'video';
  alt_text: string;
  is_primary: boolean;
  order: number;
  uploaded_at: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  is_active: boolean;
  media_files: BrandMedia[];
  primary_image: BrandMedia | null;
  images: BrandMedia[];
  videos: BrandMedia[];
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIDashboard {
  customer_segments: Record<string, number>;
  at_risk_customers: CustomerSegment[];
  sales_forecast: { weekly_revenue_history: number[]; projected_next_week_revenue: number };
  flagged_orders: { id: number; order_number: string; risk_score: number; reasons: string[]; flagged: boolean; reviewed: boolean; created_at: string }[];
  marketing_suggestions: { type: string; title: string; detail: string; suggested_action: string }[];
}

// -------------------------------------------------------------- delivery --

export interface DriverPublic {
  id: number;
  name: string;
  phone: string;
  vehicle_type: "bicycle" | "bike" | "car" | "van";
  vehicle_type_display: string;
  vehicle_plate: string;
  current_lat: string | null;
  current_lng: string | null;
  rating_avg: string;
}

export interface DriverMe {
  id: number;
  name: string;
  phone: string;
  vehicle_type: "bicycle" | "bike" | "car" | "van";
  vehicle_plate: string;
  photo: string | null;
  is_active: boolean;
  is_online: boolean;
  current_lat: string | null;
  current_lng: string | null;
  last_location_at: string | null;
  rating_avg: string;
  rating_count: number;
}

export interface DriverAdmin extends DriverMe {
  email: string;
  active_delivery_count: number;
  created_at: string;
}

export type DeliveryStatus = "unassigned" | "assigned" | "picked_up" | "en_route" | "delivered" | "cancelled" | "failed";

export interface DeliveryEvent {
  id: number;
  status: DeliveryStatus;
  note: string;
  lat: string | null;
  lng: string | null;
  created_at: string;
}

export interface DeliveryTracking {
  id: number;
  order_number: string;
  status: DeliveryStatus;
  driver: DriverPublic | null;
  pickup_label: string;
  pickup_lat: string;
  pickup_lng: string;
  dropoff_label: string;
  dropoff_lat: string | null;
  dropoff_lng: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  events: DeliveryEvent[];
}

export interface DeliveryAdmin {
  id: number;
  order_number: string;
  order_total: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_city: string;
  status: DeliveryStatus;
  driver: DriverAdmin | null;
  item_count: number;
  pickup_label: string;
  pickup_lat: string;
  pickup_lng: string;
  dropoff_label: string;
  dropoff_lat: string | null;
  dropoff_lng: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==============================================================
// USER TYPES WITH PROFILE PICTURE
// ==============================================================

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'customer' | 'vendor' | 'driver' | 'admin';
  date_joined: string;
  preferred_currency: string;
  preferred_language: string;
  profile_picture: string | null;
  profile_picture_url: string | null;
  is_phone_verified?: boolean;
  google_sub?: string | null;
  apple_sub?: string | null;
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  phone?: string;
  preferred_currency?: string;
  preferred_language?: string;
  profile_picture?: File | null;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: 'customer' | 'vendor' | 'driver';
  profile_picture?: File | null;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface PhoneOTPRequest {
  phone: string;
}

export interface PhoneOTPVerify {
  phone: string;
  code: string;
}

export interface SocialAuthData {
  provider: 'google' | 'apple';
  id_token: string;
}

// Utility type for paginated user responses
export interface PaginatedUsers {
  count: number;
  next: string | null;
  previous: string | null;
  results: User[];
}


//age group types
// AgeGroup is age-only. It does NOT carry gender — gender lives on
// Product (see ProductListItem/ProductDetail below). An age group belongs
// to a "stage" (baby/kids/teens) so the frontend knows which section to
// show it under; the Baby Boys / Baby Girls split is done with
// Product.gender, not by duplicating age groups per gender.
export type AgeGroupStage = "baby" | "kids" | "teens";

export interface AgeGroup {
  id: number;
  name: string;
  slug: string;
  stage: AgeGroupStage;
  stage_display?: string;
  icon: string;
  order: number;
  is_active: boolean;
  min_age_years: number | null;
  max_age_years: number | null;
  product_count?: number;
  created_at?: string;
  media_files?: AgeGroupMedia[];
  primary_image?: AgeGroupMedia | null;
  images?: AgeGroupMedia[];
  videos?: AgeGroupMedia[];
  // For backward compatibility
  media?: AgeGroupMedia[];
}