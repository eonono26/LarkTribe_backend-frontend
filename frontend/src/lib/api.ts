import type { Cart, Department, Paginated, ProductDetail, ProductListItem, Wishlist, Notification, SupportTicket, ChatReply, CustomerSegment, AdminReports, AIDashboard, Campaign, Coupon, AdminVendor } from "./types";
import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function sessionKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem("duka_session_key");
  if (!key) {
    key = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("duka_session_key", key);
  }
  return key;
}

export const api = {
  departments: () => request<Paginated<Department>>("/catalog/departments/"),
  categories: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<{ id: number; name: string; slug: string; department: Department }>>(`/catalog/categories/${qs ? `?${qs}` : ""}`);
  },
  products: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<ProductListItem>>(`/catalog/products/${qs ? `?${qs}` : ""}`);
  },
  product: (slug: string) => request<ProductDetail>(`/catalog/products/${slug}/`),

  // Cart
  cart: () => request<Cart>("/cart/"),
  addToCart: (product_id: number, quantity = 1) =>
    request<Cart>("/cart/items/", { method: "POST", body: JSON.stringify({ product_id, quantity }) }),
  updateCartItem: (itemId: number, quantity: number) =>
    request<Cart>(`/cart/items/${itemId}/`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
  removeCartItem: (itemId: number) =>
    request<Cart>(`/cart/items/${itemId}/`, { method: "DELETE" }),

  // Orders
  checkout: (payload: Record<string, unknown>) =>
    request("/orders/checkout/", { method: "POST", body: JSON.stringify(payload) }),
  myOrders: () => request<Paginated<unknown> | unknown[]>("/orders/mine/"),
  orderDetail: (orderNumber: string) => request(`/orders/${orderNumber}/`),

  // Auth (legacy helpers kept for back-compat with existing checkout flow)
  login: (username: string, password: string) =>
    request<{ access: string; refresh: string }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (payload: Record<string, unknown>) =>
    request("/auth/register/", { method: "POST", body: JSON.stringify(payload) }),

  // Wishlist
  wishlist: () => request<Paginated<Wishlist>>("/catalog/wishlist/"),
  addToWishlist: (product_id: number) =>
    request<Wishlist>("/catalog/wishlist/", { method: "POST", body: JSON.stringify({ product_id }) }),
  removeFromWishlist: (id: number) => request<void>(`/catalog/wishlist/${id}/`, { method: "DELETE" }),

  // Reviews
  reviews: (productId: number) => request(`/catalog/products/${productId}/reviews/`),
  addReview: (productId: number, rating: number, comment: string) =>
    request(`/catalog/products/${productId}/reviews/`, { method: "POST", body: JSON.stringify({ rating, comment }) }),

  // AI
  recommendedForYou: () => request<ProductListItem[]>(`/ai/recommended-for-you/?session_key=${sessionKey()}`),
  similarProducts: (productId: number) => request<ProductListItem[]>(`/ai/products/${productId}/similar/`),
  frequentlyBoughtTogether: (productId: number) => request<ProductListItem[]>(`/ai/products/${productId}/frequently-bought-together/`),
  smartSearch: (q: string) => request<{ query: string; used_query: string; corrected: boolean; results: ProductListItem[] }>(`/ai/search/?q=${encodeURIComponent(q)}`),
  imageSearch: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return request<ProductListItem[]>("/ai/image-search/", { method: "POST", body: fd });
  },
  chatbot: (message: string, sessionId?: number) =>
    request<ChatReply>("/ai/chatbot/", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId, session_key: sessionKey() }),
    }),

  // Promotions
  validateCoupon: (code: string, subtotal: number) =>
    request<{ valid: boolean; code?: string; discount?: number; detail?: string }>("/promotions/validate-coupon/", {
      method: "POST", body: JSON.stringify({ code, subtotal }),
    }),
  campaigns: () => request<Paginated<Campaign>>("/promotions/campaigns/?live=true"),

  // Notifications
  notifications: () => request<Paginated<Notification> | Notification[]>("/notifications/inbox/"),
  markNotificationRead: (id: number) => request(`/notifications/inbox/${id}/mark_read/`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/inbox/mark-all-read/", { method: "POST" }),
  notificationPreferences: () => request("/notifications/preferences/"),
  updateNotificationPreferences: (payload: Record<string, boolean>) =>
    request("/notifications/preferences/", { method: "PATCH", body: JSON.stringify(payload) }),

  // Support
  supportTickets: () => request<Paginated<SupportTicket> | SupportTicket[]>("/notifications/support-tickets/"),
  openSupportTicket: (subject: string, message: string, order?: number) =>
    request<SupportTicket>("/notifications/support-tickets/", { method: "POST", body: JSON.stringify({ subject, message, order }) }),
  replySupportTicket: (id: number, message: string) =>
    request(`/notifications/support-tickets/${id}/reply/`, { method: "POST", body: JSON.stringify({ message }) }),

  // Vendor apply
  applyVendor: (payload: { store_name: string; slug: string; description?: string; logo?: File }) => {
    const fd = new FormData();
    fd.append("store_name", payload.store_name);
    fd.append("slug", payload.slug);
    if (payload.description) fd.append("description", payload.description);
    if (payload.logo) fd.append("logo", payload.logo);
    return request("/vendors/apply/", { method: "POST", body: fd });
  },
  vendorSalesDashboard: () => request("/vendors/sales-dashboard/"),
  vendorPricingSuggestions: () => request("/ai/vendor/pricing-suggestions/"),
  vendorDemandForecast: () => request("/ai/vendor/demand-forecast/"),

  // Admin
  adminReports: (days = 30) => request<AdminReports>(`/analytics/admin/reports/?days=${days}`),
  adminAIDashboard: () => request<AIDashboard>("/ai/admin/dashboard/"),
  adminSegments: () => request<Paginated<CustomerSegment> | CustomerSegment[]>("/ai/admin/segments/"),
  adminRecomputeSegments: () => request("/ai/admin/segments/recompute/", { method: "POST" }),
  adminCoupons: () => request<Paginated<Coupon> | Coupon[]>("/promotions/coupons/"),
  adminCreateCoupon: (payload: Partial<Coupon>) =>
    request<Coupon>("/promotions/coupons/", { method: "POST", body: JSON.stringify(payload) }),
  adminCampaigns: () => request<Paginated<Campaign> | Campaign[]>("/promotions/campaigns/"),
  adminCreateCampaign: (payload: Partial<Campaign>) =>
    request<Campaign>("/promotions/campaigns/", { method: "POST", body: JSON.stringify(payload) }),
  adminSupportTickets: () => request<Paginated<SupportTicket> | SupportTicket[]>("/notifications/support-tickets/"),
  adminReplyTicket: (id: number, message: string) =>
    request(`/notifications/support-tickets/${id}/reply/`, { method: "POST", body: JSON.stringify({ message }) }),
  adminResolveTicket: (id: number) => request(`/notifications/support-tickets/${id}/resolve/`, { method: "POST" }),

  adminVendors: () => request<Paginated<AdminVendor> | AdminVendor[]>("/vendors/admin/"),
  adminApproveVendor: (id: number) => request<AdminVendor>(`/vendors/admin/${id}/approve/`, { method: "POST" }),
  adminSuspendVendor: (id: number) => request<AdminVendor>(`/vendors/admin/${id}/suspend/`, { method: "POST" }),

  adminModerationProducts: (status = "pending") =>
    request<Paginated<ProductDetail> | ProductDetail[]>(`/catalog/admin/products/?status=${status}`),
  adminApproveProduct: (id: number) => request(`/catalog/admin/products/${id}/approve/`, { method: "POST" }),
  adminRejectProduct: (id: number) => request(`/catalog/admin/products/${id}/reject/`, { method: "POST" }),

  // Behavior tracking (fire-and-forget)
  track: (event_type: string, extra: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") return;
    fetch(`${API_URL}/analytics/track/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: JSON.stringify({ event_type, session_key: sessionKey(), ...extra }),
    }).catch(() => {});
  },
};

export function mediaUrl(path: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = API_URL.replace(/\/api$/, "");
  return `${base}${path}`;
}

export function formatKES(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}
