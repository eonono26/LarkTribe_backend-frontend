import type { Cart, Category, Department, Paginated, ProductDetail, ProductListItem, Wishlist, Notification, SupportTicket, ChatReply, CustomerSegment, AdminReports, AIDashboard, Campaign, Coupon, AdminVendor, Brand, ShowcaseVideoItem, Address, PaymentMethod, WalletCoupon, CouponClaim, AgeGroup, DeliveryTracking, DeliveryAdmin, DriverMe, DriverAdmin, User, AuthResponse, RegisterData, PhoneOTPRequest, PhoneOTPVerify, SocialAuthData } from "./types";
import { getToken } from "./auth";
import axios from "axios";

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
  // ==============================================================
  // AUTHENTICATION
  // ==============================================================

  home: () => request<{ hero_campaigns: Campaign[]; departments: Department[]; age_groups: AgeGroup[]; new_arrivals: ProductListItem[]; categories: Category[] }>('/catalog/home/'),
  
  auth: {
    // Register new user
    register: (data: RegisterData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'profile_picture' && value instanceof File) {
            formData.append(key, value);
          } else if (typeof value !== 'object') {
            formData.append(key, String(value));
          } else {
            formData.append(key, JSON.stringify(value));
          }
        }
      });
      return request<User>("/auth/register/", { 
        method: "POST", 
        body: formData 
      });
    },

    // Login with username/password
    login: (username: string, password: string) =>
      request<{ access: string; refresh: string }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),

    // Refresh token
    refreshToken: (refresh: string) =>
      request<{ access: string }>("/auth/token/refresh/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      }),

    // Get current user
    me: () => request<User>("/auth/me/"),

    // Update current user
    updateMe: (data: Partial<User> | FormData) => {
      const isFormData = data instanceof FormData;
      const headers: Record<string, string> = isFormData ? {} : { "Content-Type": "application/json" };
      const body = isFormData ? data : JSON.stringify(data);
      return request<User>("/auth/me/", { 
        method: "PATCH", 
        body,
        headers,
      });
    },

    // Social auth (Google/Apple)
    social: (data: SocialAuthData) =>
      request<AuthResponse>("/auth/social/", { 
        method: "POST", 
        body: JSON.stringify(data) 
      }),

    // Phone OTP
    phoneRequestOTP: (data: PhoneOTPRequest) =>
      request<{ detail: string; debug_code?: string }>("/auth/phone/request-otp/", { 
        method: "POST", 
        body: JSON.stringify(data) 
      }),

    phoneVerifyOTP: (data: PhoneOTPVerify) =>
      request<AuthResponse>("/auth/phone/verify-otp/", { 
        method: "POST", 
        body: JSON.stringify(data) 
      }),

    // Profile picture management
    uploadProfilePicture: (file: File) => {
      const formData = new FormData();
      formData.append('profile_picture', file);
      return request<User>("/auth/profile-picture/", {
        method: "POST",
        body: formData,
      });
    },

    deleteProfilePicture: () =>
      request<User>("/auth/profile-picture/", {
        method: "DELETE",
      }),
  },

  // ==============================================================
  // CATALOG
  // ==============================================================

  departments: async (params?: Record<string, any>) => {
    const response = await axios.get(`${API_URL}/catalog/departments/`, { params });
    return response.data.results || response.data;
  },

  departmentMedia: async (departmentId: number) => {
    const response = await axios.get(`${API_URL}/catalog/departments/${departmentId}/media/`);
    return response.data;
  },

  uploadDepartmentMedia: async (departmentId: number, formData: FormData) => {
    const response = await axios.post(
      `${API_URL}/catalog/departments/${departmentId}/media/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  categories: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<Category>>(`/catalog/categories/${qs ? `?${qs}` : ""}`);
  },
  // Full category tree grouped by department — Kids -> Baby -> Dresses/Tops/...
  categoryTree: () => request<(Category["department"] & { categories: Category[] })[]>(`/catalog/categories/tree/`),
  categorySubcategories: (id: number | string) =>
    request<{ parent: Category; subcategories: Category[]; count: number }>(`/catalog/categories/${id}/subcategories/`),
  categoryProducts: (id: number | string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<ProductListItem>>(`/catalog/categories/${id}/products/${qs ? `?${qs}` : ""}`);
  },

  // Age Groups - Standard list. AgeGroup is age-only (stage: baby/kids/teens);
  // gender is never on AgeGroup — filter products by gender separately.
  ageGroups: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<AgeGroup[]>(`/catalog/age-groups/${qs ? `?${qs}` : ""}`);
  },
  // Age groups for one stage, e.g. ageGroupsByStage("baby") -> 0-3 Months, 3-6 Months, ...
  ageGroupsByStage: (stage: "baby" | "kids" | "teens" = "baby") =>
    request<{ stage: string; age_groups: AgeGroup[]; count: number }>(
      `/catalog/age-groups/by-stage/?stage=${stage}`
    ),
  ageGroupProducts: (id: number | string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<ProductListItem>>(`/catalog/age-groups/${id}/products/${qs ? `?${qs}` : ""}`);
  },

  products: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<ProductListItem>>(`/catalog/products/${qs ? `?${qs}` : ""}`);
  },
  // Convenience endpoint for the Kids -> Baby -> Boys/Girls -> Age -> Category
  // flow: /catalog/products/baby/?gender=girls&age=6-12-months&category=dresses
  babyProducts: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<ProductListItem>>(`/catalog/products/baby/${qs ? `?${qs}` : ""}`);
  },
  product: (slug: string) => request<ProductDetail>(`/catalog/products/${slug}/`),

  // Brands
  brands: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request<Paginated<Brand>>(`/catalog/brands/${qs ? `?${qs}` : ""}`);
  },
  brand: (id: number | string) => request<Brand>(`/catalog/brands/${id}/`),
  brandProducts: (id: number | string) =>
    request<{ brand: Brand; products: ProductListItem[]; count: number }>(`/catalog/brands/${id}/products/`),


  // ==============================================================
  // CART
  // ==============================================================

  cart: () => request<Cart>("/cart/"),
  addToCart: (product_id: number | string, quantity = 1, variant_id?: number | string | null) =>
    request<Cart>("/cart/items/", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity, ...(variant_id ? { variant_id } : {}) }),
    }),
  updateCartItem: (itemId: number, quantity: number) =>
    request<Cart>(`/cart/items/${itemId}/`, { method: "PATCH", body: JSON.stringify({ quantity }) }),
  removeCartItem: (itemId: number) =>
    request<Cart>(`/cart/items/${itemId}/`, { method: "DELETE" }),

  // ==============================================================
  // ORDERS
  // ==============================================================

  checkout: (payload: Record<string, unknown>) =>
    request<{ order_number: string; total: string; shipping_fee: string }>("/orders/checkout/", { method: "POST", body: JSON.stringify(payload) }),
  myOrders: () => request<Paginated<unknown> | unknown[]>("/orders/mine/"),
  orderDetail: (orderNumber: string) => request(`/orders/${orderNumber}/`),

  // ==============================================================
  // WISHLIST
  // ==============================================================

  wishlist: () => request<Paginated<Wishlist>>("/catalog/wishlist/"),
  addToWishlist: (product_id: number | string) =>
    request<Wishlist>("/catalog/wishlist/", { method: "POST", body: JSON.stringify({ product_id }) }),
  removeFromWishlist: (id: number) => request<void>(`/catalog/wishlist/${id}/`, { method: "DELETE" }),

  // ==============================================================
  // REVIEWS
  // ==============================================================

  reviews: (productId: number | string) => request(`/catalog/products/${productId}/reviews/`),
  addReview: (productId: number | string, rating: number, comment: string) =>
    request(`/catalog/products/${productId}/reviews/`, { method: "POST", body: JSON.stringify({ rating, comment }) }),

  // ==============================================================
  // AI & RECOMMENDATIONS
  // ==============================================================

  recommendedForYou: () => request<ProductListItem[]>(`/ai/recommended-for-you/?session_key=${sessionKey()}`),
  similarProducts: (productId: number | string) => request<ProductListItem[]>(`/ai/products/${productId}/similar/`),
  frequentlyBoughtTogether: (productId: number | string) => request<ProductListItem[]>(`/ai/products/${productId}/frequently-bought-together/`),
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

  // ==============================================================
  // PROMOTIONS
  // ==============================================================

  validateCoupon: (code: string, subtotal: number) =>
    request<{ valid: boolean; code?: string; discount?: number; detail?: string }>("/promotions/validate-coupon/", {
      method: "POST", body: JSON.stringify({ code, subtotal }),
    }),
  campaigns: () => request<Paginated<Campaign>>("/promotions/campaigns/?live=true"),
  showcaseVideos: () => request<Paginated<ShowcaseVideoItem>>("/promotions/showcase-videos/"),

  // Coupon wallet ("My Coupons")
  availableCoupons: () => request<WalletCoupon[]>("/promotions/coupons/available/"),
  myCoupons: () => request<CouponClaim[]>("/promotions/coupons/mine/"),
  claimCoupon: (code: string) =>
    request<CouponClaim>("/promotions/coupons/claim/", { method: "POST", body: JSON.stringify({ code }) }),

  // ==============================================================
  // ADDRESS BOOK
  // ==============================================================

  addresses: () => request<Address[] | Paginated<Address>>("/auth/addresses/"),
  createAddress: (payload: Omit<Address, "id" | "created_at">) =>
    request<Address>("/auth/addresses/", { method: "POST", body: JSON.stringify(payload) }),
  updateAddress: (id: number, payload: Partial<Omit<Address, "id" | "created_at">>) =>
    request<Address>(`/auth/addresses/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAddress: (id: number) => request<void>(`/auth/addresses/${id}/`, { method: "DELETE" }),
  setDefaultAddress: (id: number) => request<Address>(`/auth/addresses/${id}/set_default/`, { method: "POST" }),

  // ==============================================================
  // PAYMENT METHODS
  // ==============================================================

  paymentMethods: () => request<PaymentMethod[] | Paginated<PaymentMethod>>("/auth/payment-methods/"),
  createPaymentMethod: (payload: Partial<Omit<PaymentMethod, "id" | "created_at">>) =>
    request<PaymentMethod>("/auth/payment-methods/", { method: "POST", body: JSON.stringify(payload) }),
  deletePaymentMethod: (id: number) => request<void>(`/auth/payment-methods/${id}/`, { method: "DELETE" }),
  setDefaultPaymentMethod: (id: number) => request<PaymentMethod>(`/auth/payment-methods/${id}/set_default/`, { method: "POST" }),

  // ==============================================================
  // NOTIFICATIONS
  // ==============================================================

  notifications: () => request<Paginated<Notification> | Notification[]>("/notifications/inbox/"),
  markNotificationRead: (id: number) => request(`/notifications/inbox/${id}/mark_read/`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/inbox/mark-all-read/", { method: "POST" }),
  notificationPreferences: () => request("/notifications/preferences/"),
  updateNotificationPreferences: (payload: Record<string, boolean>) =>
    request("/notifications/preferences/", { method: "PATCH", body: JSON.stringify(payload) }),

  // ==============================================================
  // SUPPORT
  // ==============================================================

  supportTickets: () => request<Paginated<SupportTicket> | SupportTicket[]>("/notifications/support-tickets/"),
  openSupportTicket: (subject: string, message: string, order?: number) =>
    request<SupportTicket>("/notifications/support-tickets/", { method: "POST", body: JSON.stringify({ subject, message, order }) }),
  replySupportTicket: (id: number, message: string) =>
    request(`/notifications/support-tickets/${id}/reply/`, { method: "POST", body: JSON.stringify({ message }) }),

  // ==============================================================
  // VENDOR
  // ==============================================================

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

  // ==============================================================
  // ADMIN
  // ==============================================================

  adminReports: (days = 30) => request<AdminReports>(`/analytics/admin/reports/?days=${days}`),
  adminAIDashboard: () => request<AIDashboard>("/ai/admin/dashboard/"),
  adminSegments: () => request<Paginated<CustomerSegment> | CustomerSegment[]>("/ai/admin/segments/"),
  adminRecomputeSegments: () => request("/ai/admin/segments/recompute/", { method: "POST" }),
  adminCoupons: () => request<Paginated<Coupon> | Coupon[]>("/promotions/coupons/"),
  adminCreateCoupon: (payload: Partial<Coupon>) =>
    request<Coupon>("/promotions/coupons/", { method: "POST", body: JSON.stringify(payload) }),
  adminCampaigns: () => request<Paginated<Campaign> | Campaign[]>("/promotions/campaigns/"),
  adminCreateCampaign: (payload: Partial<Campaign> & { imageFile?: File }) => {
    const { imageFile, ...rest } = payload;
    if (!imageFile) {
      return request<Campaign>("/promotions/campaigns/", { method: "POST", body: JSON.stringify(rest) });
    }
    const fd = new FormData();
    Object.entries(rest).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") fd.append(key, String(value));
    });
    fd.append("image", imageFile);
    return request<Campaign>("/promotions/campaigns/", { method: "POST", body: fd });
  },
  adminDeleteCampaign: (id: number) => request(`/promotions/campaigns/${id}/`, { method: "DELETE" }),
  adminSupportTickets: () => request<Paginated<SupportTicket> | SupportTicket[]>("/notifications/support-tickets/"),
  adminReplyTicket: (id: number, message: string) =>
    request(`/notifications/support-tickets/${id}/reply/`, { method: "POST", body: JSON.stringify({ message }) }),
  adminResolveTicket: (id: number) => request(`/notifications/support-tickets/${id}/resolve/`, { method: "POST" }),

  adminVendors: (status?: string) =>
    request<Paginated<AdminVendor> | AdminVendor[]>(`/vendors/admin/${status ? `?status=${status}` : ""}`),
  adminApproveVendor: (id: number) => request<AdminVendor>(`/vendors/admin/${id}/approve/`, { method: "POST" }),
  adminSuspendVendor: (id: number) => request<AdminVendor>(`/vendors/admin/${id}/suspend/`, { method: "POST" }),

  adminModerationProducts: (status = "pending") =>
    request<Paginated<ProductDetail> | ProductDetail[]>(`/catalog/admin/products/?status=${status}`),
  adminApproveProduct: (id: number | string) => request(`/catalog/admin/products/${id}/approve/`, { method: "POST" }),
  adminRejectProduct: (id: number | string) => request(`/catalog/admin/products/${id}/reject/`, { method: "POST" }),

  // ==============================================================
  // BEHAVIOR TRACKING
  // ==============================================================

  track: (event_type: string, extra: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") return;
    fetch(`${API_URL}/analytics/track/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: JSON.stringify({ event_type, session_key: sessionKey(), ...extra }),
    }).catch(() => {});
  },

  // ==============================================================
  // DELIVERY
  // ==============================================================

  delivery: {
    // Customer: live tracking for one order (works for guests too, like order tracking).
    track: (orderNumber: string) => request<DeliveryTracking>(`/delivery/orders/${orderNumber}/tracking/`),

    // Driver: own profile — online toggle + posted location.
    me: () => request<DriverMe>(`/delivery/driver/me/`),
    updateMe: (patch: Partial<{ is_online: boolean; current_lat: number | string; current_lng: number | string; vehicle_type: DriverMe["vehicle_type"]; vehicle_plate: string; phone: string }>) =>
      request<DriverMe>(`/delivery/driver/me/`, { method: "PATCH", body: JSON.stringify(patch) }),

    // Driver: jobs. scope "available" = unassigned pool, "mine" = assigned to me.
    deliveries: (scope: "available" | "mine" = "mine") =>
      request<DeliveryAdmin[]>(`/delivery/driver/deliveries/?scope=${scope}`),
    driverAction: (deliveryId: number, action: "accept" | "pickup" | "en_route" | "deliver" | "cancel") =>
      request<DeliveryAdmin>(`/delivery/driver/deliveries/${deliveryId}/${action}/`, { method: "POST" }),

    // Admin dispatch board.
    adminDeliveries: (status?: string) =>
      request<Paginated<DeliveryAdmin> | DeliveryAdmin[]>(`/delivery/admin/deliveries/${status ? `?status=${status}` : ""}`),
    adminDrivers: () => request<Paginated<DriverAdmin> | DriverAdmin[]>(`/delivery/admin/drivers/`),
    adminAssign: (deliveryId: number, driverId: number) =>
      request<DeliveryAdmin>(`/delivery/admin/deliveries/${deliveryId}/assign/`, { method: "POST", body: JSON.stringify({ driver_id: driverId }) }),
  },
};

export function mediaUrl(path: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = API_URL.replace(/\/api$/, "");
  return `${base}${path}`;
}

/**
 * Turns the "API 400: {...}" errors thrown by request() into a sentence a
 * shopper can read (e.g. "Only 2 of Linen Shirt (White / M) left in stock.").
 */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof Error) {
    const m = /^API \d+: ([\s\S]*)$/.exec(err.message);
    if (m) {
      try {
        const body = JSON.parse(m[1]);
        if (typeof body === "string") return body;
        if (Array.isArray(body) && typeof body[0] === "string") return body[0];
        if (body && typeof body.detail === "string") return body.detail;
        const first = body && typeof body === "object" ? Object.values(body)[0] : null;
        if (Array.isArray(first) && typeof first[0] === "string") return first[0];
        if (typeof first === "string") return first;
      } catch {
        // not JSON — fall through
      }
    }
  }
  return fallback;
}

export function formatKES(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
}