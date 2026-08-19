"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bike, Car, Truck, MapPin, Navigation, CheckCircle2, Power } from "lucide-react";
import { api } from "@/lib/api";
import { auth, isLoggedIn } from "@/lib/auth";
import type { DriverMe, DeliveryAdmin } from "@/lib/types";

const VEHICLE_ICON: Record<string, any> = { bicycle: Bike, bike: Bike, car: Car, van: Truck };

const ACTION_FOR_STATUS: Record<string, { action: "accept" | "pickup" | "en_route" | "deliver"; label: string }> = {
  unassigned: { action: "accept", label: "Accept job" },
  assigned: { action: "pickup", label: "Mark picked up" },
  picked_up: { action: "en_route", label: "Start delivering" },
  en_route: { action: "deliver", label: "Mark delivered" },
};

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

export default function DriverDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<DriverMe | null>(null);
  const [available, setAvailable] = useState<DeliveryAdmin[]>([]);
  const [mine, setMine] = useState<DeliveryAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [profile, avail, jobs] = await Promise.all([
        api.delivery.me(),
        api.delivery.deliveries("available"),
        api.delivery.deliveries("mine"),
      ]);
      setMe(profile);
      setAvailable(unwrap(avail));
      setMine(unwrap(jobs));
    } catch {
      router.push("/driver/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/driver/login");
      return;
    }
    refresh();
    const poll = setInterval(refresh, 8000);
    return () => clearInterval(poll);
  }, [refresh, router]);

  // While online, keep posting the driver's real position so customers see it move.
  useEffect(() => {
    if (!me?.is_online || typeof navigator === "undefined" || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        api.delivery.updateMe({ current_lat: pos.coords.latitude, current_lng: pos.coords.longitude }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [me?.is_online]);

  async function toggleOnline() {
    if (!me) return;
    const updated = await api.delivery.updateMe({ is_online: !me.is_online });
    setMe(updated);
  }

  async function act(deliveryId: number, action: "accept" | "pickup" | "en_route" | "deliver") {
    setActingOn(deliveryId);
    try {
      await api.delivery.driverAction(deliveryId, action);
      await refresh();
    } finally {
      setActingOn(null);
    }
  }

  function logout() {
    auth.logout();
    router.push("/driver/login");
  }

  if (loading || !me) return <main className="container-shell py-10 text-neutral-400">Loading…</main>;

  const VehicleIcon = VEHICLE_ICON[me.vehicle_type] || Bike;

  return (
    <main className="container-shell py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--color-ink)] text-white flex items-center justify-center">
            <VehicleIcon size={20} />
          </div>
          <div>
            <p className="font-display font-bold">{me.name}</p>
            <p className="text-xs text-neutral-500">{me.vehicle_plate || "No plate on file"}</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-neutral-400 underline">Sign out</button>
      </div>

      <button
        onClick={toggleOnline}
        className={`w-full flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-sm uppercase tracking-wide mb-8 transition-colors ${
          me.is_online ? "bg-[var(--color-ink)] text-white" : "border border-[var(--color-line)] text-neutral-500"
        }`}
      >
        <Power size={16} />
        {me.is_online ? "Online — accepting jobs" : "Offline — go online"}
      </button>

      {!me.is_online && (
        <p className="text-xs text-center text-neutral-400 mb-8">Go online to see nearby jobs and share your location with customers.</p>
      )}

      {mine.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3">Your active deliveries</h2>
          <div className="space-y-3">
            {mine.map((d) => {
              const next = ACTION_FOR_STATUS[d.status];
              return (
                <div key={d.id} className="border border-[var(--color-line)] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{d.shipping_name}</p>
                      <p className="text-xs text-neutral-500">{d.item_count} item{d.item_count === 1 ? "" : "s"} · Order {d.order_number}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-[var(--color-mist)] px-2 py-1 rounded-full">
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-neutral-500 mb-1">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-[#2f6f4f]" />
                    <span>{d.pickup_label}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-neutral-500 mb-3">
                    <Navigation size={13} className="mt-0.5 shrink-0 text-[#c96e6e]" />
                    <span>{d.dropoff_label}</span>
                  </div>
                  {next && (
                    <button
                      onClick={() => act(d.id, next.action)}
                      disabled={actingOn === d.id}
                      className="w-full flex items-center justify-center gap-1.5 bg-[var(--color-ink)] text-white text-xs font-semibold uppercase py-2.5 rounded-full disabled:opacity-40"
                    >
                      <CheckCircle2 size={14} />
                      {actingOn === d.id ? "Updating…" : next.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {me.is_online && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3">Available jobs nearby</h2>
          {available.length === 0 ? (
            <p className="text-sm text-neutral-400">No jobs waiting right now — check back soon.</p>
          ) : (
            <div className="space-y-3">
              {available.map((d) => (
                <div key={d.id} className="border border-[var(--color-line)] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{d.shipping_city}</p>
                      <p className="text-xs text-neutral-500">{d.item_count} item{d.item_count === 1 ? "" : "s"} · Order {d.order_number}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-neutral-500 mb-1">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-[#2f6f4f]" />
                    <span>{d.pickup_label}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-neutral-500 mb-3">
                    <Navigation size={13} className="mt-0.5 shrink-0 text-[#c96e6e]" />
                    <span>{d.dropoff_label}</span>
                  </div>
                  <button
                    onClick={() => act(d.id, "accept")}
                    disabled={actingOn === d.id}
                    className="w-full bg-[var(--color-ink)] text-white text-xs font-semibold uppercase py-2.5 rounded-full disabled:opacity-40"
                  >
                    {actingOn === d.id ? "Accepting…" : "Accept job"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
