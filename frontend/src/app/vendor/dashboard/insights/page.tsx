"use client";

import { useEffect, useState } from "react";
import { vendorApi, VendorProduct } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

interface PricingSuggestion {
  product_id: number;
  current_price: number;
  suggested_price: number;
  change_percent: number;
  reason: string;
}

interface DemandForecast {
  product_id: number;
  weekly_history: number[];
  forecast_units_next_period: number;
  current_stock: number;
  reorder_point: number;
  reorder_recommended: boolean;
  reorder_quantity: number;
  demand_trend?: "accelerating" | "steady" | "falling";
  recent_units_30d?: number;
  views_30d?: number;
}

export default function VendorInsightsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [pricing, setPricing] = useState<PricingSuggestion[]>([]);
  const [forecast, setForecast] = useState<DemandForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  async function applyPrice(productId: number) {
    setActing(`price-${productId}`);
    setActionMessage("");
    try {
      const result = await vendorApi.applyPricingSuggestion(productId);
      setActionMessage(`Price updated to ${formatKES((result as { current_price: number }).current_price)}.`);
      const [p, pricingRes, forecastRes] = await Promise.all([
        vendorApi.myProducts(),
        vendorApi.pricingSuggestions(),
        vendorApi.demandForecast(),
      ]);
      setProducts(Array.isArray(p) ? p : p.results);
      setPricing((pricingRes as PricingSuggestion[]) || []);
      setForecast((forecastRes as DemandForecast[]) || []);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Couldn't apply the price suggestion.");
    } finally {
      setActing(null);
    }
  }

  async function requestReorder(productId: number) {
    setActing(`reorder-${productId}`);
    setActionMessage("");
    try {
      const result = await vendorApi.requestReorder(productId);
      setActionMessage(result.detail);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Couldn't submit the replenishment request.");
    } finally {
      setActing(null);
    }
  }

  useEffect(() => {
    Promise.all([vendorApi.myProducts(), vendorApi.pricingSuggestions(), vendorApi.demandForecast()])
      .then(([p, pricingRes, forecastRes]) => {
        setProducts(Array.isArray(p) ? p : p.results);
        setPricing((pricingRes as PricingSuggestion[]) || []);
        setForecast((forecastRes as DemandForecast[]) || []);
      })
      .catch(() => setError("Couldn't load AI insights right now."))
      .finally(() => setLoading(false));
  }, []);

  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `Product #${id}`;

  if (loading) return <p className="text-sm text-neutral-500">Loading AI insights…</p>;
  if (error) return <p className="text-sm text-[var(--color-flag)]">{error}</p>;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-black mb-1">AI Sales Insights</h1>
        <p className="text-sm text-neutral-500 mb-6">
          Pricing and demand signals generated from recent sales activity across your store.
        </p>
      </div>
      {actionMessage && (
        <p role="status" className="border border-[var(--color-line)] bg-[var(--color-mist)] px-4 py-3 text-sm">
          {actionMessage}
        </p>
      )}

      <section>
        <h2 className="font-display font-bold mb-3">Dynamic pricing suggestions</h2>
        {pricing.length === 0 ? (
          <p className="text-sm text-neutral-500">No pricing suggestions yet — check back once you have more sales history.</p>
        ) : (
          <div className="space-y-2">
            {pricing.map((s) => (
              <div key={s.product_id} className="border border-[var(--color-line)] rounded-lg p-4 text-sm">
                <div className="flex flex-wrap justify-between gap-2 font-semibold">
                  <span>{productName(s.product_id)}</span>
                  <span className={s.change_percent > 0 ? "text-[var(--dept-maternity)]" : "text-[var(--color-flag)]"}>
                    {formatKES(s.current_price)} → {formatKES(s.suggested_price)} ({s.change_percent > 0 ? "+" : ""}
                    {s.change_percent}%)
                  </span>
                </div>
                <p className="text-neutral-500 text-xs mt-1">{s.reason}</p>
                {s.change_percent !== 0 && (
                  <button
                    type="button"
                    disabled={acting === `price-${s.product_id}`}
                    onClick={() => applyPrice(s.product_id)}
                    className="mt-3 border border-[var(--color-ink)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    {acting === `price-${s.product_id}` ? "Applying…" : "Apply suggested price"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-bold mb-3">Inventory & demand forecast</h2>
        {forecast.length === 0 ? (
          <p className="text-sm text-neutral-500">No forecast data yet — this fills in as your orders build up.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {forecast.map((f) => (
              <div key={f.product_id} className="border border-[var(--color-line)] rounded-lg p-4 text-sm">
                <p className="font-semibold">{productName(f.product_id)}</p>
                <p className="text-neutral-500 text-xs mt-1">
                  Forecast next period: <span className="font-semibold text-[var(--color-ink)]">{f.forecast_units_next_period} units</span>
                  {" · "}Current stock: <span className="font-semibold text-[var(--color-ink)]">{f.current_stock}</span>
                </p>
                {f.demand_trend && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Demand {f.demand_trend}
                    {typeof f.recent_units_30d === "number" ? ` · ${f.recent_units_30d} sold / 30 days` : ""}
                    {typeof f.views_30d === "number" ? ` · ${f.views_30d} views` : ""}
                  </p>
                )}
                {f.reorder_recommended ? (
                  <>
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[var(--color-flag)]/10 text-[var(--color-flag)]">
                      Reorder {f.reorder_quantity} units — below reorder point ({f.reorder_point})
                    </span>
                    <button
                      type="button"
                      disabled={acting === `reorder-${f.product_id}`}
                      onClick={() => requestReorder(f.product_id)}
                      className="mt-3 block border border-[var(--color-ink)] px-3 py-2 text-[11px] font-bold uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-50"
                    >
                      {acting === `reorder-${f.product_id}` ? "Submitting…" : "Request replenishment"}
                    </button>
                  </>
                ) : (
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-[var(--dept-maternity)]/10 text-[var(--dept-maternity)]">
                    Stock healthy
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
