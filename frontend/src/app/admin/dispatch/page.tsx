"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DeliveryAdmin, DriverAdmin } from "@/lib/types";

const AdminDispatchMap = dynamic(() => import("@/components/AdminDispatchMap"), { ssr: false });

function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : data.results || [];
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "unassigned", label: "Unassigned" },
  { value: "assigned", label: "Assigned" },
  { value: "picked_up", label: "Picked up" },
  { value: "en_route", label: "En route" },
  { value: "delivered", label: "Delivered" },
];

export default function AdminDispatchPage() {
  const [deliveries, setDeliveries] = useState<DeliveryAdmin[]>([]);
  const [drivers, setDrivers] = useState<DriverAdmin[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [assigning, setAssigning] = useState<number | null>(null);
  const [pickedDriver, setPickedDriver] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [d, dr] = await Promise.all([
      api.delivery.adminDeliveries(statusFilter || undefined),
      api.delivery.adminDrivers(),
    ]);
    setDeliveries(unwrap(d));
    setDrivers(unwrap(dr));
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 10000);
    return () => clearInterval(poll);
  }, [refresh]);

  async function assign(deliveryId: number) {
    const driverId = pickedDriver[deliveryId];
    if (!driverId) return;
    setAssigning(deliveryId);
    try {
      await api.delivery.adminAssign(deliveryId, parseInt(driverId, 10));
      await refresh();
    } finally {
      setAssigning(null);
    }
  }

  const onlineDrivers = drivers.filter((d) => d.is_online && d.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-black">Dispatch</h1>
        <p className="text-xs text-neutral-400">{onlineDrivers.length} driver{onlineDrivers.length === 1 ? "" : "s"} online</p>
      </div>

      <div className="h-80 rounded-xl overflow-hidden border border-[var(--color-line)]">
        <AdminDispatchMap drivers={drivers} deliveries={deliveries} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${
              statusFilter === f.value ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]" : "border-[var(--color-line)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading deliveries…</p>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-neutral-400">No deliveries match this filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-neutral-400 border-b border-[var(--color-line)]">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Dropoff</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Driver</th>
                <th className="py-2 pr-4">Assign</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-b border-[var(--color-line)] last:border-0">
                  <td className="py-3 pr-4 font-semibold">{d.order_number}</td>
                  <td className="py-3 pr-4">{d.shipping_name}<br /><span className="text-xs text-neutral-400">{d.shipping_phone}</span></td>
                  <td className="py-3 pr-4 max-w-[220px] truncate">{d.dropoff_label}</td>
                  <td className="py-3 pr-4">
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-[var(--color-mist)] px-2 py-1 rounded-full">
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 pr-4">{d.driver ? d.driver.name : <span className="text-neutral-400">—</span>}</td>
                  <td className="py-3 pr-4">
                    {d.status === "unassigned" ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={pickedDriver[d.id] || ""}
                          onChange={(e) => setPickedDriver((p) => ({ ...p, [d.id]: e.target.value }))}
                          className="bg-[var(--color-mist)] rounded-lg px-2 py-1.5 text-xs outline-none"
                        >
                          <option value="">Choose driver…</option>
                          {onlineDrivers.map((dr) => (
                            <option key={dr.id} value={dr.id}>{dr.name} ({dr.vehicle_type}) — {dr.active_delivery_count} active</option>
                          ))}
                        </select>
                        <button
                          onClick={() => assign(d.id)}
                          disabled={!pickedDriver[d.id] || assigning === d.id}
                          className="btn btn-ink btn-sm"
                        >
                          {assigning === d.id ? "…" : "Assign"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
