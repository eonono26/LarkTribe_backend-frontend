"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Bike, Car, Truck, Star, Phone } from "lucide-react";
import { api } from "@/lib/api";
import type { DeliveryTracking } from "@/lib/types";

const DeliveryTrackingMap = dynamic(() => import("./DeliveryTrackingMap"), { ssr: false });

const VEHICLE_ICON: Record<string, any> = { bicycle: Bike, bike: Bike, car: Car, van: Truck };

const STATUS_LABEL: Record<string, string> = {
  unassigned: "Finding you a driver",
  assigned: "Driver assigned",
  picked_up: "Order picked up",
  en_route: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Delivery failed",
};

const TIMELINE_ORDER = ["assigned", "picked_up", "en_route", "delivered"];

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
  const stepIndex = TIMELINE_ORDER.indexOf(tracking.status);

  const pickup = { lat: parseFloat(tracking.pickup_lat), lng: parseFloat(tracking.pickup_lng) };
  const dropoff = tracking.dropoff_lat && tracking.dropoff_lng
    ? { lat: parseFloat(tracking.dropoff_lat), lng: parseFloat(tracking.dropoff_lng) }
    : null;
  const driverPos = tracking.driver?.current_lat && tracking.driver?.current_lng
    ? { lat: parseFloat(tracking.driver.current_lat), lng: parseFloat(tracking.driver.current_lng) }
    : null;

  return (
    <div className="mt-10 border-t border-[var(--color-line)] pt-6">
      <p className="font-semibold text-[var(--color-ink)] mb-3">Delivery tracking</p>

      {isActive && (dropoff || driverPos) && (
        <div className="h-64 rounded-xl overflow-hidden border border-[var(--color-line)] mb-4">
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

      <p className="text-sm font-semibold uppercase tracking-wide mb-4">{STATUS_LABEL[tracking.status] || tracking.status}</p>

      {/* Status timeline, Bolt-trip style */}
      {tracking.status !== "cancelled" && tracking.status !== "failed" && (
        <div className="flex items-center mb-6">
          {TIMELINE_ORDER.map((s, i) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`h-2.5 w-2.5 rounded-full ${i <= stepIndex ? "bg-[var(--color-ink)]" : "bg-[var(--color-line)]"}`} />
              {i < TIMELINE_ORDER.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < stepIndex ? "bg-[var(--color-ink)]" : "bg-[var(--color-line)]"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {tracking.driver && (
        <div className="flex items-center gap-3 bg-[var(--color-mist)] rounded-xl p-4 mb-4">
          <div className="h-11 w-11 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center shrink-0">
            <VehicleIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{tracking.driver.name}</p>
            <p className="text-xs text-neutral-500">
              {tracking.driver.vehicle_type_display}
              {tracking.driver.vehicle_plate ? ` · ${tracking.driver.vehicle_plate}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold shrink-0">
            <Star size={13} className="fill-[var(--color-signal)] text-[var(--color-signal)]" />
            {parseFloat(tracking.driver.rating_avg).toFixed(1)}
          </div>
          {tracking.driver.phone && (
            <a href={`tel:${tracking.driver.phone}`} className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-line)]" aria-label="Call driver">
              <Phone size={15} />
            </a>
          )}
        </div>
      )}

      {tracking.events.length > 0 && (
        <ol className="space-y-2 text-xs text-neutral-500">
          {[...tracking.events].reverse().map((e) => (
            <li key={e.id} className="flex justify-between">
              <span>{STATUS_LABEL[e.status] || e.status}{e.note ? ` — ${e.note}` : ""}</span>
              <span>{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
