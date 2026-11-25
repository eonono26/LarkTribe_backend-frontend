"use client";

import { useEffect, useMemo, useState } from "react";
import { vendorApi, VendorOrderItem } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function VendorOrdersPage() {
  const [items, setItems] = useState<VendorOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  function load() {
    setLoading(true);
    vendorApi.myOrderItems().then(setItems).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(itemId: number, status: string) {
    setBusyId(itemId);
    try {
      const updated = await vendorApi.updateOrderItemStatus(itemId, status);
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(
    () => (statusFilter ? items.filter((i) => i.fulfillment_status === statusFilter) : items),
    [items, statusFilter]
  );

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display text-lg font-bold">Order items</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[var(--color-mist)] rounded-full px-4 py-2 text-sm outline-none capitalize"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {items.length === 0 ? "No orders yet." : "No items match this status."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-[var(--color-line)]">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Subtotal</th>
                <th className="py-2 pr-4">Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-[var(--color-line)]">
                  <td className="py-2 pr-4">
                    <p className="font-mono text-xs font-semibold">{i.order_number}</p>
                    <p className="text-xs text-neutral-400">{new Date(i.order_created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="py-2 pr-4">{i.product_name}</td>
                  <td className="py-2 pr-4 text-neutral-500">
                    {i.shipping_name}
                    <span className="text-xs block text-neutral-400">{i.shipping_city}</span>
                  </td>
                  <td className="py-2 pr-4">{i.quantity}</td>
                  <td className="py-2 pr-4 font-semibold">{formatKES(i.subtotal)}</td>
                  <td className="py-2 pr-4">
                    <select
                      value={i.fulfillment_status}
                      disabled={busyId === i.id}
                      onChange={(e) => updateStatus(i.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1.5 rounded-full capitalize outline-none border-0 disabled:opacity-40 ${
                        STATUS_STYLE[i.fulfillment_status] ?? ""
                      }`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
