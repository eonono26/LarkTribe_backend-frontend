"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AdminVendor } from "@/lib/types";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.adminVendors().then((r) => setVendors(Array.isArray(r) ? r : r.results)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function approve(id: number) {
    await api.adminApproveVendor(id);
    load();
  }
  async function suspend(id: number) {
    await api.adminSuspendVendor(id);
    load();
  }

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-black mb-6">Vendor approval</h1>
      <div className="space-y-3">
        {vendors.map((v) => (
          <div key={v.id} className="flex items-center justify-between border border-[var(--color-line)] rounded-lg p-4">
            <div>
              <p className="font-semibold">{v.store_name}</p>
              <p className="text-xs text-neutral-500">@{v.username} · {v.status}</p>
              {v.description && <p className="text-sm text-neutral-600 mt-1 max-w-md">{v.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {v.status !== "approved" && (
                <button onClick={() => approve(v.id)} className="bg-[var(--color-ink)] text-white text-xs font-semibold uppercase px-4 py-2 rounded-full">
                  Approve
                </button>
              )}
              {v.status !== "suspended" && (
                <button onClick={() => suspend(v.id)} className="border border-[var(--color-flag)] text-[var(--color-flag)] text-xs font-semibold uppercase px-4 py-2 rounded-full">
                  Suspend
                </button>
              )}
            </div>
          </div>
        ))}
        {vendors.length === 0 && <p className="text-sm text-neutral-500">No vendors yet.</p>}
      </div>
    </div>
  );
}
