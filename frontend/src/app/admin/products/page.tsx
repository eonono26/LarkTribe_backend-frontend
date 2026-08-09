"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { api, formatKES, mediaUrl } from "@/lib/api";
import type { ProductDetail } from "@/lib/types";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminProductModerationPage() {
  const [status, setStatus] = useState("pending");
  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  function load(s: string) {
    setLoading(true);
    api
      .adminModerationProducts(s)
      .then((r) => setProducts(Array.isArray(r) ? r : r.results))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(status), [status]);

  async function approve(id: number) {
    await api.adminApproveProduct(id);
    load(status);
  }
  async function reject(id: number) {
    await api.adminRejectProduct(id);
    load(status);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.vendor_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-black">Product moderation</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, vendor, or SKU…"
          className="bg-[var(--color-mist)] rounded-full px-4 py-2 text-sm outline-none w-64 max-w-full"
        />
      </div>

      <div className="flex gap-1 border-b border-[var(--color-line)] mb-6">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              status === t.value
                ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                : "border-transparent text-neutral-500 hover:text-[var(--color-ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {products.length === 0 ? `Nothing ${status}.` : "No products match your search."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border border-[var(--color-line)] rounded-lg p-4">
              <div className="relative h-14 w-12 rounded-md overflow-hidden bg-[var(--color-mist)] shrink-0">
                {p.images?.[0]?.image ? (
                  <Image src={mediaUrl(p.images[0].image)} alt={p.name} fill className="object-cover" sizes="48px" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-neutral-500">
                  {p.vendor_name} · SKU {p.sku} · {formatKES(p.price)}
                </p>
              </div>
              {status === "pending" ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(p.id)}
                    className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase px-4 py-2 rounded-full"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(p.id)}
                    className="border border-[var(--color-flag)] text-[var(--color-flag)] text-xs font-semibold uppercase px-4 py-2 rounded-full"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <span
                  className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-full shrink-0 ${
                    status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
