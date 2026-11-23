"use client";

/**
 * Marketing events for Meta Pixel + TikTok Pixel. Safe to call anywhere: it does
 * nothing unless the shopper accepted marketing cookies AND a pixel is loaded.
 */
export const MARKETING_CONSENT_KEY = "lt_marketing_consent";

type W = Window & { fbq?: (...a: unknown[]) => void; ttq?: { track: (...a: unknown[]) => void; page: () => void } };

export function hasMarketingConsent(): boolean {
  try { return localStorage.getItem(MARKETING_CONSENT_KEY) === "granted"; } catch { return false; }
}

export interface TrackData {
  id?: string | number;
  name?: string;
  value?: number;
  quantity?: number;
  contents?: { id: string | number; quantity: number; item_price?: number }[];
  eventId?: string;
}

export function trackEvent(
  event: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search" | "AddToWishlist" | "TryOn",
  d: TrackData = {},
) {
  if (typeof window === "undefined" || !hasMarketingConsent()) return;
  const w = window as W;
  const contents = d.contents || (d.id != null ? [{ id: d.id, quantity: d.quantity || 1 }] : undefined);
  try {
    if (w.fbq) {
      const meta = event === "TryOn" ? "CustomizeProduct" : event;
      w.fbq("track", meta, {
        content_ids: contents?.map((c) => String(c.id)), content_type: "product", content_name: d.name,
        value: d.value, currency: "KES", contents,
      }, d.eventId ? { eventID: d.eventId } : undefined);
    }
    if (w.ttq) {
      const tt: Record<string, string> = {
        ViewContent: "ViewContent", AddToCart: "AddToCart", InitiateCheckout: "InitiateCheckout", Purchase: "CompletePayment",
        Search: "Search", AddToWishlist: "AddToWishlist", TryOn: "ClickButton",
      };
      w.ttq.track(tt[event], {
        content_id: contents?.[0]?.id != null ? String(contents[0].id) : undefined, content_type: "product", content_name: d.name,
        value: d.value, currency: "KES", quantity: d.quantity,
        contents: contents?.map((c) => ({ content_id: String(c.id), quantity: c.quantity, price: c.item_price })),
      });
    }
  } catch { /* never break the page for analytics */ }
}
