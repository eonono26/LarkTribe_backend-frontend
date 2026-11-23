import { getToken } from "./auth";
import { API_URL } from "./config";
import type { ProductListItem } from "./types";

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      msg = typeof j === "string" ? j : j.detail || (Array.isArray(j) ? j[0] : Object.values(j)[0] as string) || msg;
      if (Array.isArray(msg)) msg = msg[0];
    } catch { /* keep default */ }
    throw new Error(String(msg));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface PublicConfig {
  meta_pixel_id: string;
  tiktok_pixel_id: string;
  whatsapp_number: string;
  social: { instagram: string; facebook: string; tiktok: string };
  payments: { mpesa: boolean; card_providers: string[]; cod: boolean };
  features: { tryon: boolean; viewer_360: boolean; geolocation: boolean };
}

export interface TryOnLook {
  id: number;
  status: "pending" | "processing" | "done" | "failed";
  error: string;
  product: number;
  product_name: string;
  product_slug: string;
  color: string;
  outfit: { id: number; name: string; slug: string }[];
  result_url: string | null;
  is_saved: boolean;
  is_shared: boolean;
  share_path: string | null;
  created_at: string;
}

export interface TryOnConfig {
  enabled: boolean;
  provider: string;
  photorealistic: boolean;
  daily_limit: number;
  max_upload_mb: number;
  retention_days: number;
  privacy_notice: string;
}

export interface SizeRecommendation {
  size: string | null;
  alternatives?: string[];
  confidence?: "high" | "medium" | "low";
  in_stock?: boolean;
  reason: string;
  tip?: string;
  disclaimer: string;
}

export interface DeliveryQuote {
  distance_km: number;
  fee: number;
  standard_fee: number;
  free_shipping: boolean;
  eta: string;
  city: string | null;
  pickup_point: { id: number | null; name: string; address: string; city: string; distance_km: number; opening_hours: string };
}

let cfgPromise: Promise<PublicConfig> | null = null;

export const features = {
  publicConfig: () => (cfgPromise ??= req<PublicConfig>("/integrations/public-config/").catch((e) => { cfgPromise = null; throw e; })),

  // ---- virtual try-on
  tryOnConfig: () => req<TryOnConfig>("/tryon/config/"),
  tryOnCreate: (form: FormData) => req<TryOnLook>("/tryon/", { method: "POST", body: form }),
  tryOnGet: (id: number) => req<TryOnLook>(`/tryon/${id}/`),
  tryOnSave: (id: number, saved: boolean) => req<TryOnLook>(`/tryon/${id}/save/`, { method: "POST", body: JSON.stringify({ saved }) }),
  tryOnShare: (id: number, shared: boolean) => req<TryOnLook>(`/tryon/${id}/share/`, { method: "POST", body: JSON.stringify({ shared }) }),
  tryOnDelete: (id: number) => req<void>(`/tryon/${id}/`, { method: "DELETE" }),
  myLooks: () => req<TryOnLook[]>("/tryon/looks/"),
  sharedLook: (token: string) => req<TryOnLook>(`/tryon/shared/${token}/`),

  // ---- AI size guidance
  sizeRecommendation: (body: Record<string, unknown>) =>
    req<SizeRecommendation>("/ai/size-recommendation/", { method: "POST", body: JSON.stringify(body) }),

  // ---- location (only ever called after the shopper allows location)
  deliveryEstimate: (lat: number, lng: number, subtotal = 0) =>
    req<DeliveryQuote>(`/integrations/delivery-estimate/?lat=${lat}&lng=${lng}&subtotal=${subtotal}`),
  locationPing: (lat: number, lng: number) =>
    req<{ city: string }>("/integrations/location-ping/", { method: "POST", body: JSON.stringify({ lat, lng }) }),
  popularNear: (p: { city?: string; lat?: number; lng?: number }) => {
    const q = p.city ? `city=${encodeURIComponent(p.city)}` : `lat=${p.lat}&lng=${p.lng}`;
    return req<{ city: string | null; results: ProductListItem[] }>(`/integrations/popular-near/?${q}`);
  },

  // ---- card payments
  payWithCard: (orderNumber: string, provider?: string) =>
    req<{ payment: { status: string; redirect_url?: string; message?: string } }>(`/orders/${orderNumber}/pay/card/`, {
      method: "POST", body: JSON.stringify(provider ? { card_provider: provider } : {}),
    }),
  verifyCard: (orderNumber: string) =>
    req<{ order_status: string; payment_status: string; message: string }>(`/orders/${orderNumber}/card/verify/`, { method: "POST" }),
};
