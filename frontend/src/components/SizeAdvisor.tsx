"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import { features, type SizeRecommendation } from "@/lib/features-api";

/**
 * "Find my size" - AI size guidance from the shopper's own measurements.
 * Always shows a no-guarantee disclaimer (it is guidance, not a fit promise).
 */
export default function SizeAdvisor({
  productId, onPick,
}: {
  productId: number | string;
  onPick?: (size: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState("");
  const [chest, setChest] = useState("");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState<"months" | "years">("months");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rec, setRec] = useState<SizeRecommendation | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setRec(null);
    if (!height && !age) { setError("Enter a height or an age."); return; }
    setBusy(true);
    try {
      const ageMonths = age ? Number(age) * (ageUnit === "years" ? 12 : 1) : undefined;
      setRec(await features.sizeRecommendation({
        product_id: productId,
        height_cm: height ? Number(height) : undefined,
        chest_cm: chest ? Number(chest) : undefined,
        age_months: ageMonths,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't work out a size.");
    } finally { setBusy(false); }
  }

  const input = "w-full bg-stone-50 border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-black";

  return (
    <div className="border border-stone-200">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 text-xs uppercase tracking-widest"><Ruler size={14} strokeWidth={1.6} /> Find my size</span>
        <span className="text-stone-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="px-4 pb-4 space-y-3 border-t border-stone-100 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[10px] uppercase tracking-widest text-stone-500">Height (cm)
              <input className={`${input} mt-1`} inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 98" />
            </label>
            <label className="text-[10px] uppercase tracking-widest text-stone-500">Chest (cm) · optional
              <input className={`${input} mt-1`} inputMode="decimal" value={chest} onChange={(e) => setChest(e.target.value)} placeholder="e.g. 56" />
            </label>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-stone-500">Or child&apos;s age</span>
            <div className="flex gap-2 mt-1">
              <input className={input} inputMode="decimal" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 18" />
              <select className={`${input} w-28`} value={ageUnit} onChange={(e) => setAgeUnit(e.target.value as "months" | "years")}>
                <option value="months">months</option><option value="years">years</option>
              </select>
            </div>
          </div>
          <button disabled={busy} className="w-full py-3 bg-black text-white text-[11px] uppercase tracking-widest disabled:opacity-50">
            {busy ? "Working it out…" : "Suggest my size"}
          </button>
          {error && <p className="text-xs text-red-700">{error}</p>}
          {rec && (
            <div className="bg-stone-50 border border-stone-200 p-3 text-sm space-y-2">
              {rec.size ? (
                <>
                  <p className="text-[13px] tracking-[0.08em] font-editorial text-lg">Your best size is <strong className="font-medium">{rec.size}</strong></p>
                  <p className="text-xs text-stone-600">{rec.reason}</p>
                  {rec.in_stock === false && <p className="text-xs text-red-700">This size may be out of stock for this product.</p>}
                  {rec.alternatives && rec.alternatives.length > 0 && <p className="text-xs text-stone-500">Next closest: {rec.alternatives.join(", ")}. {rec.tip}</p>}
                  {onPick && rec.in_stock !== false && (
                    <button type="button" onClick={() => onPick(rec.size!)} className="text-[11px] uppercase tracking-widest underline underline-offset-4">Select {rec.size}</button>
                  )}
                </>
              ) : (
                <p className="text-xs text-stone-600">{rec.reason}</p>
              )}
              <p className="text-[10px] text-stone-400 leading-relaxed">{rec.disclaimer}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
