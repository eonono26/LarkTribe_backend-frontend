"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProductDetail } from "@/lib/types";

export default function AdminProductModerationPage() {
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.adminModerationProducts("pending").then((r) => setProducts(Array.isArray(r) ? r : r.results)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function approve(id: number) {
    await api.adminApproveProduct(id);
    load();
  }
  async function reject(id: number) {
    await api.adminRejectProduct(id);
    load();
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-black mb-6">Product moderation</h1>
      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing pending review.</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-[var(--color-line)] rounded-lg p-4">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-neutral-500">{p.vendor_name} · SKU {p.sku}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => approve(p.id)} className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase px-4 py-2 rounded-full">
                  Approve
                </button>
                <button onClick={() => reject(p.id)} className="border border-[var(--color-flag)] text-[var(--color-flag)] text-xs font-semibold uppercase px-4 py-2 rounded-full">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
