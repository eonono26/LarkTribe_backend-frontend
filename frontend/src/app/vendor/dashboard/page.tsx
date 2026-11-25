"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { vendorApi, VendorProduct, VendorOrderItem } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

interface PricingSuggestion {
  product_id: number;
  current_price: number;
  suggested_price: number;
  change_percent: number;
  reason: string;
}

export default function VendorOverviewPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orderItems, setOrderItems] = useState<VendorOrderItem[]>([]);
  const [pricing, setPricing] = useState<PricingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([vendorApi.myProducts(), vendorApi.myOrderItems(), vendorApi.pricingSuggestions()])
      .then(([p, o, ai]) => {
        setProducts(Array.isArray(p) ? p : p.results);
        setOrderItems(o);
        setPricing((ai as PricingSuggestion[]).filter((s) => s.change_percent !== 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const revenue = orderItems.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
  const activeCount = products.filter((p) => p.status === "active").length;
  const pendingCount = products.filter((p) => p.status === "pending").length;
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Products" value={String(products.length)} />
        <StatCard label="Live" value={String(activeCount)} />
        <StatCard label="Pending review" value={String(pendingCount)} />
        <StatCard label="Order items revenue" value={formatKES(revenue)} />
      </div>
      <div className="flex gap-3 mb-10">
        <Link href="/vendor/dashboard/products" className="text-sm font-semibold underline">
          Manage products →
        </Link>
        <Link href="/vendor/dashboard/orders" className="text-sm font-semibold underline">
          View orders →
        </Link>
      </div>

      {pricing.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display font-bold">AI sales insights</h2>
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Pricing suggestions</span>
          </div>
          <div className="space-y-2">
            {pricing.slice(0, 5).map((s) => (
              <div key={s.product_id} className="border border-[var(--color-line)] rounded-lg p-3 text-sm">
                <div className="flex justify-between font-semibold">
                  <span>{productName(s.product_id)}</span>
                  <span className={s.change_percent > 0 ? "text-[var(--dept-maternity)]" : "text-[var(--color-flag)]"}>
                    {formatKES(s.current_price)} → {formatKES(s.suggested_price)} ({s.change_percent > 0 ? "+" : ""}
                    {s.change_percent}%)
                  </span>
                </div>
                <p className="text-neutral-500 text-xs mt-1">{s.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
