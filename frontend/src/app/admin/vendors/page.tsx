"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { api, mediaUrl } from "@/lib/api";
import type { AdminVendor } from "@/lib/types";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminVendorsPage() {
  const [status, setStatus] = useState("");
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  function load(s: string) {
    setLoading(true);
    api
      .adminVendors(s || undefined)
      .then((r) => setVendors(Array.isArray(r) ? r : r.results))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(status), [status]);

  async function approve(id: number) {
    await api.adminApproveVendor(id);
    load(status);
  }
  async function suspend(id: number) {
    await api.adminSuspendVendor(id);
    load(status);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => v.store_name.toLowerCase().includes(q) || v.username.toLowerCase().includes(q));
  }, [vendors, query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="font-display text-2xl font-black">Vendor approval</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search store or username…"
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
          {vendors.length === 0 ? "No vendors here." : "No vendors match your search."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <div key={v.id} className="flex items-center gap-4 border border-[var(--color-line)] rounded-lg p-4">
              <div className="relative h-12 w-12 rounded-full overflow-hidden bg-[var(--color-mist)] shrink-0">
                {v.logo ? (
                  <Image src={mediaUrl(v.logo)} alt={v.store_name} fill className="object-cover" sizes="48px" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-bold text-neutral-400">
                    {v.store_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{v.store_name}</p>
                <p className="text-xs text-neutral-500">
                  @{v.username} · commission {v.commission_rate}%
                </p>
                {v.description && <p className="text-sm text-neutral-600 mt-1 max-w-md line-clamp-2">{v.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-full ${
                    v.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : v.status === "suspended"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {v.status}
                </span>
                {v.status !== "approved" && (
                  <button
                    onClick={() => approve(v.id)}
                    className="btn btn-ink btn-sm"
                  >
                    Approve
                  </button>
                )}
                {v.status !== "suspended" && (
                  <button
                    onClick={() => suspend(v.id)}
                    className="border border-[var(--color-flag)] text-[var(--color-flag)] text-xs font-semibold uppercase px-4 py-2 rounded-full"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
