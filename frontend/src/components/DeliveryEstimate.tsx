"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { useGeo } from "@/lib/geo";
import { features, type DeliveryQuote } from "@/lib/features-api";
import { useLocalization } from "@/lib/localization-context";

/**
 * Location-based delivery cost + time + nearest pickup point.
 * Only asks for location when the shopper taps the button.
 */
export default function DeliveryEstimate({ subtotal = 0 }: { subtotal?: number }) {
  const { coords, status, request } = useGeo();
  const { formatPrice } = useLocalization();
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!coords) return;
    let alive = true;
    features.deliveryEstimate(coords.lat, coords.lng, subtotal).then((q) => alive && setQuote(q)).catch(() => alive && setError("Couldn't estimate delivery right now."));
    return () => { alive = false; };
  }, [coords, subtotal]);

  if (quote) {
    return (
      <div className="text-sm space-y-1">
        <p>
          Delivery to {quote.city || "your location"}:{" "}
          <strong className="font-medium">{quote.free_shipping ? "Free" : formatPrice(quote.fee)}</strong> · {quote.eta}
        </p>
        <p className="text-xs text-stone-500">
          Nearest pickup point: {quote.pickup_point.name} ({quote.pickup_point.distance_km} km) · {quote.pickup_point.opening_hours}
        </p>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <button type="button" onClick={() => request()} disabled={status === "asking"}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest underline underline-offset-4 disabled:opacity-50">
        <MapPin size={13} /> {status === "asking" ? "Locating…" : "Estimate delivery to my location"}
      </button>
      <p className="text-[11px] text-stone-400 mt-1">
        {status === "denied" ? "Location is off — enter your address at checkout instead." : error || "Only used with your permission. Never tracked in the background."}
      </p>
    </div>
  );
}
