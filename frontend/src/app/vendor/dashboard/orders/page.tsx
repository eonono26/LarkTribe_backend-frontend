"use client";

import { useEffect, useState } from "react";
import { vendorApi, VendorOrderItem } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

export default function VendorOrdersPage() {
  const [items, setItems] = useState<VendorOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorApi.myOrderItems().then(setItems).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div>
      <h2 className="font-display text-lg font-bold mb-4">Order items</h2>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 border-b border-[var(--color-line)]">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Unit price</th>
                <th className="py-2 pr-4">Subtotal</th>
                <th className="py-2 pr-4">Fulfillment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-[var(--color-line)]">
                  <td className="py-2 pr-4">{i.product_name}</td>
                  <td className="py-2 pr-4">{i.quantity}</td>
                  <td className="py-2 pr-4">{formatKES(i.unit_price)}</td>
                  <td className="py-2 pr-4 font-semibold">{formatKES(i.subtotal)}</td>
                  <td className="py-2 pr-4 capitalize">{i.fulfillment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
