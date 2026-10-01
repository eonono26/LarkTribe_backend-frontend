"use client";

import { useEffect, useState } from "react";
import { vendorApi, VendorCoupon } from "@/lib/vendor-api";
import { formatKES } from "@/lib/api";

const emptyForm = { code: "", percent_off: "", amount_off: "", valid_until: "" };

export default function VendorPromotionsPage() {
  const [coupons, setCoupons] = useState<VendorCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    vendorApi
      .coupons()
      .then((res) => setCoupons(Array.isArray(res) ? res : res.results))
      .catch(() => setError("Couldn't load your coupons."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return;
    setSaving(true);
    setError("");
    try {
      await vendorApi.createCoupon({
        code: form.code.trim().toUpperCase(),
        percent_off: form.percent_off ? Number(form.percent_off) : null,
        amount_off: form.amount_off ? form.amount_off : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        active: true,
      });
      setForm(emptyForm);
      load();
    } catch {
      setError("Couldn't create that coupon — check the code isn't already taken.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: VendorCoupon) {
    await vendorApi.updateCoupon(c.id, { active: !c.active });
    load();
  }

  async function remove(c: VendorCoupon) {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await vendorApi.deleteCoupon(c.id);
    load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-black mb-1">Coupons & Promotions</h1>
        <p className="text-sm text-neutral-500">Create discount codes shoppers can apply at checkout.</p>
      </div>

      <form onSubmit={handleCreate} className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 items-end border border-[var(--color-line)] rounded-lg p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Code</label>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="SAVE20"
            className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2.5 mt-1 outline-none"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">% off</label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.percent_off}
            onChange={(e) => setForm({ ...form, percent_off: e.target.value, amount_off: "" })}
            placeholder="e.g. 10"
            className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2.5 mt-1 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Or KSh off</label>
          <input
            type="number"
            min={1}
            value={form.amount_off}
            onChange={(e) => setForm({ ...form, amount_off: e.target.value, percent_off: "" })}
            placeholder="e.g. 500"
            className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2.5 mt-1 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Expires</label>
          <input
            type="date"
            value={form.valid_until}
            onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            className="w-full bg-[var(--color-mist)] rounded-lg px-3 py-2.5 mt-1 outline-none"
          />
        </div>
        <button
          disabled={saving}
          className="sm:col-span-2 md:col-span-4 btn btn-ink w-max"
        >
          {saving ? "Creating…" : "Create coupon"}
        </button>
      </form>

      {error && <p className="text-sm text-[var(--color-flag)]">{error}</p>}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading coupons…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-neutral-500">No coupons yet — create one above.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border border-[var(--color-line)] rounded-lg p-3 text-sm">
              <div>
                <p className="font-mono font-bold">{c.code}</p>
                <p className="text-neutral-500 text-xs">
                  {c.percent_off ? `${c.percent_off}% off` : c.amount_off ? `${formatKES(c.amount_off)} off` : "—"}
                  {c.valid_until ? ` · expires ${new Date(c.valid_until).toLocaleDateString()}` : " · no expiry"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${
                    c.active ? "bg-[var(--dept-maternity)]/10 text-[var(--dept-maternity)]" : "bg-[var(--color-mist)] text-neutral-500"
                  }`}
                >
                  {c.active ? "Active" : "Paused"}
                </span>
                <button onClick={() => toggleActive(c)} className="text-xs font-semibold underline">
                  {c.active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => remove(c)} className="text-xs font-semibold text-[var(--color-flag)] underline">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
