"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Bike, Car, Truck, Star, Phone } from "lucide-react";
import { api } from "@/lib/api";
import type { DeliveryTracking } from "@/lib/types";

const DeliveryTrackingMap = dynamic(() => import("./DeliveryTrackingMap"), { ssr: false });

const VEHICLE_ICON: Record<string, any> = { bicycle: Bike, bike: Bike, car: Car, van: Truck };

const STATUS_LABEL: Record<string, string> = {
  unassigned: "Finding you a courier",
  assigned: "Courier Assigned",
  picked_up: "Order Picked Up",
  en_route: "En Route To You",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Delivery Failed",
};

const TIMELINE_ORDER = [
  { key: "assigned", label: "Assigned" },
  { key: "picked_up", label: "Picked Up" },
  { key: "en_route", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

const ACTIVE_STATUSES = new Set(["unassigned", "assigned", "picked_up", "en_route"]);

export default function LiveDeliveryTracker({ orderNumber }: { orderNumber: string }) {
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.delivery.track(orderNumber);
        if (!cancelled) setTracking(data);
      } catch {
        // no delivery record yet, or tracking temporarily unavailable
      }
    }

    load();
    pollRef.current = setInterval(load, 6000);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderNumber]);

  if (!tracking) return null;

  const VehicleIcon = tracking.driver ? VEHICLE_ICON[tracking.driver.vehicle_type] || Bike : Bike;
  const isActive = ACTIVE_STATUSES.has(tracking.status);
  const stepIndex = TIMELINE_ORDER.findIndex((s) => s.key === tracking.status);

  const pickup = { lat: parseFloat(tracking.pickup_lat), lng: parseFloat(tracking.pickup_lng) };
  const dropoff = tracking.dropoff_lat && tracking.dropoff_lng
    ? { lat: parseFloat(tracking.dropoff_lat), lng: parseFloat(tracking.dropoff_lng) }
    : null;
  const driverPos = tracking.driver?.current_lat && tracking.driver?.current_lng
    ? { lat: parseFloat(tracking.driver.current_lat), lng: parseFloat(tracking.driver.current_lng) }
    : null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-widest text-stone-500 font-semibold">Live Tracking</span>
        {isActive && (
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-olive font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse" /> Live
          </span>
        )}
      </div>

      <div className="bg-stone-900 text-stone-100 rounded-2xl overflow-hidden shadow-xl">
        {isActive && (dropoff || driverPos) && (
          <div className="h-56 sm:h-64 relative border-b border-white/10">
            <DeliveryTrackingMap
              pickup={pickup}
              dropoff={dropoff}
              driver={driverPos}
              pickupLabel={tracking.pickup_label}
              dropoffLabel={tracking.dropoff_label}
              driverLabel={tracking.driver?.name}
            />
          </div>
        )}

        <div className="p-5 sm:p-6">
          <p className="font-editorial text-xl sm:text-2xl mb-5">{STATUS_LABEL[tracking.status] || tracking.status}</p>

          {tracking.status !== "cancelled" && tracking.status !== "failed" && (
            <div className="flex items-center mb-6">
              {TIMELINE_ORDER.map((s, i) => (
                <div key={s.key} className="flex-1 flex flex-col items-center relative">
                  <div className="flex items-center w-full">
                    <div className={`h-px flex-1 ${i === 0 ? "opacity-0" : i <= stepIndex ? "bg-white" : "bg-white/20"}`} />
                    <div
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        i <= stepIndex ? "bg-white" : "bg-white/20"
                      }`}
                    />
                    <div className={`h-px flex-1 ${i === TIMELINE_ORDER.length - 1 ? "opacity-0" : i < stepIndex ? "bg-white" : "bg-white/20"}`} />
                  </div>
                  <span className={`mt-2 text-[10px] uppercase tracking-wider ${i <= stepIndex ? "text-stone-200" : "text-stone-500"}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tracking.driver && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="h-11 w-11 rounded-full bg-white/10 text-stone-100 flex items-center justify-center shrink-0">
                <VehicleIcon size={19} strokeWidth={1.6} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tracking.driver.name}</p>
                <p className="text-xs text-stone-400">
                  {tracking.driver.vehicle_type_display}
                  {tracking.driver.vehicle_plate ? ` · ${tracking.driver.vehicle_plate}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium shrink-0 text-stone-200">
                <Star size={13} className="fill-amber-400 text-amber-400" />
                {parseFloat(tracking.driver.rating_avg).toFixed(1)}
              </div>
              {tracking.driver.phone && (
                <a
                  href={`tel:${tracking.driver.phone}`}
                  className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full border border-white/20 hover:bg-white/10 transition"
                  aria-label="Call driver"
                >
                  <Phone size={15} strokeWidth={1.6} />
                </a>
              )}
            </div>
          )}

          {tracking.events.length > 0 && (
            <ol className="space-y-2 text-xs text-stone-400 mt-5 pt-5 border-t border-white/10">
              {[...tracking.events].reverse().map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span className="text-stone-300">{STATUS_LABEL[e.status] || e.status}{e.note ? ` — ${e.note}` : ""}</span>
                  <span>{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
