const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vendor_access_token");
}

export function setToken(token: string) {
  localStorage.setItem("vendor_access_token", token);
}

export function clearToken() {
  localStorage.removeItem("vendor_access_token");
}

export function isVendorLoggedIn(): boolean {
  return !!getToken();
}

async function authedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
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

export interface VendorProductImage {
  id: number;
  image: string;
  alt_text: string;
  order: number;
}

export interface VendorProduct {
  id: number;
  category: number;
  brand: number | null;
  name: string;
  description: string;
  price: string;
  compare_at_price: string | null;
  stock: number;
  sku: string;
  status: string;
  images?: VendorProductImage[];
}

export interface VendorOrderItem {
  id: number;
  product: number;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
  fulfillment_status: string;
  order_number: string;
  order_created_at: string;
  shipping_name: string;
  shipping_city: string;
}

export interface VendorCoupon {
  id: number;
  code: string;
  percent_off: number | null;
  amount_off: string | null;
  active: boolean;
  valid_until: string | null;
}

export const vendorApi = {
  login: (username: string, password: string) =>
    authedRequest<{ access: string; refresh: string }>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  myProfile: () => authedRequest("/vendors/me/"),
  myProducts: () => authedRequest<{ results: VendorProduct[] } | VendorProduct[]>("/catalog/my-products/"),
  createProduct: (payload: Partial<VendorProduct>) =>
    authedRequest<VendorProduct>("/catalog/my-products/", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id: number, payload: Partial<VendorProduct>) =>
    authedRequest<VendorProduct>(`/catalog/my-products/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProduct: (id: number) => authedRequest<void>(`/catalog/my-products/${id}/`, { method: "DELETE" }),
  uploadProductImage: (productId: number, file: File, isPrimary = false) => {
    const fd = new FormData();
    fd.append("image", file);
    if (isPrimary) fd.append("is_primary", "true");
    return authedRequest<VendorProductImage>(`/catalog/my-products/${productId}/images/`, { method: "POST", body: fd });
  },
  deleteProductImage: (productId: number, imageId: number) =>
    authedRequest<void>(`/catalog/my-products/${productId}/images/${imageId}/`, { method: "DELETE" }),
  myOrderItems: () => authedRequest<VendorOrderItem[]>("/orders/vendor-items/"),
  updateOrderItemStatus: (itemId: number, fulfillment_status: string) =>
    authedRequest<VendorOrderItem>(`/orders/vendor-items/${itemId}/`, {
      method: "PATCH",
      body: JSON.stringify({ fulfillment_status }),
    }),
  categories: () => authedRequest<{ results: { id: number; name: string; department: { name: string } }[] }>("/catalog/categories/"),
  salesDashboard: () => authedRequest("/vendors/sales-dashboard/"),
  pricingSuggestions: () => authedRequest("/ai/vendor/pricing-suggestions/"),
  demandForecast: () => authedRequest("/ai/vendor/demand-forecast/"),
  // Coupons & Promotions — backend permits vendors to manage coupons (IsAdminOrVendor)
  coupons: () => authedRequest<{ results: VendorCoupon[] } | VendorCoupon[]>("/promotions/coupons/"),
  createCoupon: (payload: Partial<VendorCoupon>) =>
    authedRequest<VendorCoupon>("/promotions/coupons/", { method: "POST", body: JSON.stringify(payload) }),
  updateCoupon: (id: number, payload: Partial<VendorCoupon>) =>
    authedRequest<VendorCoupon>(`/promotions/coupons/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCoupon: (id: number) => authedRequest<void>(`/promotions/coupons/${id}/`, { method: "DELETE" }),
};
