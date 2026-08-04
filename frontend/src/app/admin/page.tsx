"use client";

import { useEffect, useState } from "react";
import { api, formatKES } from "@/lib/api";
import type { AdminReports, AIDashboard } from "@/lib/types";

export default function AdminOverviewPage() {
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [ai, setAI] = useState<AIDashboard | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  function load() {
    Promise.all([api.adminReports(), api.adminAIDashboard()]).then(([r, a]) => {
      setReports(r);
      setAI(a);
    });
  }

  useEffect(load, []);

  async function recompute() {
    setRecomputing(true);
    await api.adminRecomputeSegments();
    load();
    setRecomputing(false);
  }

  if (!reports || !ai) return <p className="text-sm text-neutral-500">Loading reports…</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-black mb-4">Reports & Analytics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Orders (30d)" value={String(reports.orders)} />
          <Stat label="Revenue (30d)" value={formatKES(reports.revenue)} />
          <Stat label="New users (30d)" value={String(reports.new_users)} />
          <Stat label="Active vendors" value={String(reports.active_vendors)} />
          <Stat label="Pending vendors" value={String(reports.pending_vendors)} />
          <Stat label="Products awaiting review" value={String(reports.products_pending_moderation)} />
          <Stat label="Open support tickets" value={String(reports.open_support_tickets)} />
        </div>

        <h2 className="font-display font-bold mt-8 mb-3">Conversion funnel</h2>
        <div className="flex gap-4 text-sm">
          {Object.entries(reports.conversion_funnel).map(([k, v]) => (
            <div key={k} className="border border-[var(--color-line)] rounded-lg px-4 py-2">
              <p className="text-xs text-neutral-500 capitalize">{k.replace(/_/g, " ")}</p>
              <p className="font-bold">{v}</p>
            </div>
          ))}
        </div>

        {reports.top_products.length > 0 && (
          <>
            <h2 className="font-display font-bold mt-8 mb-3">Top products (30d)</h2>
            <div className="space-y-1 text-sm">
              {reports.top_products.map((p) => (
                <div key={p.product__id} className="flex justify-between border-b border-[var(--color-line)] py-1.5">
                  <span>{p.product__name}</span>
                  <span className="text-neutral-500">{p.units_sold} sold</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-black">AI Dashboard</h2>
          <button onClick={recompute} disabled={recomputing} className="text-xs font-semibold underline disabled:opacity-40">
            {recomputing ? "Recomputing…" : "Recompute customer segments"}
          </button>
        </div>

        <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-neutral-500">Customer segments</h3>
        <div className="flex gap-3 flex-wrap mb-6">
          {Object.entries(ai.customer_segments).map(([seg, count]) => (
            <div key={seg} className="border border-[var(--color-line)] rounded-lg px-4 py-2 text-sm">
              <span className="capitalize">{seg.replace(/_/g, " ")}</span>: <span className="font-bold">{count}</span>
            </div>
          ))}
          {Object.keys(ai.customer_segments).length === 0 && (
            <p className="text-sm text-neutral-500">No segments computed yet — click &ldquo;Recompute&rdquo; above.</p>
          )}
        </div>

        <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-neutral-500">Sales forecast</h3>
        <p className="text-sm mb-6">
          Projected next week&apos;s revenue: <span className="font-bold">{formatKES(ai.sales_forecast.projected_next_week_revenue)}</span>
        </p>

        {ai.flagged_orders.length > 0 && (
          <>
            <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-neutral-500">Flagged orders (fraud detection)</h3>
            <div className="space-y-2 mb-6">
              {ai.flagged_orders.map((o) => (
                <div key={o.id} className="border border-[var(--color-flag)] rounded-lg p-3 text-sm">
                  <p className="font-semibold">{o.order_number} — risk {(o.risk_score * 100).toFixed(0)}%</p>
                  <ul className="list-disc list-inside text-neutral-500 text-xs mt-1">
                    {o.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        {ai.marketing_suggestions.length > 0 && (
          <>
            <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-neutral-500">
              Automated marketing recommendations
            </h3>
            <div className="space-y-2">
              {ai.marketing_suggestions.map((s, i) => (
                <div key={i} className="border border-[var(--color-line)] rounded-lg p-3 text-sm">
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-neutral-500 text-xs mt-1">{s.detail}</p>
                  <p className="text-xs mt-1 font-semibold">Suggested: {s.suggested_action}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--color-line)] rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
