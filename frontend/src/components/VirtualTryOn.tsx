"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Heart, Ruler, Share2, Sparkles, Trash2, Upload, X } from "lucide-react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import {
  TryOnNotConfiguredError,
  deleteSavedLook,
  fetchSizeAdvice,
  generateLook,
  listSavedLooks,
  saveLook,
  type SavedLook,
  type SizeAdvice,
} from "@/lib/tryon";

export type TryOnGarment = {
  id: number | string;
  name: string;
  imageUrl: string | null;
  color?: string;
};

type VirtualTryOnProps = {
  productId: number | string;
  productName: string;
  productImageUrl?: string | null;
  /** The product's own colours, each with its photo, so shoppers can compare colours. */
  colors?: TryOnGarment[];
  /** Other products for mix-and-match styling (similar / complete-the-look). */
  suggestions?: TryOnGarment[];
  hasSizeGuide?: boolean;
  selectedColor?: string | null;
};

type Look = { key: string; garment: TryOnGarment; url: string; blob: Blob };

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_SELECTED = 4;

export default function VirtualTryOn({
  productId,
  productName,
  productImageUrl,
  colors = [],
  suggestions = [],
  hasSizeGuide = false,
  selectedColor,
}: VirtualTryOnProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"studio" | "saved">("studio");
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"separate" | "outfit">("separate");
  const [picked, setPicked] = useState<string[]>([]);
  const [looks, setLooks] = useState<Look[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notEnabled, setNotEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<SavedLook[]>([]);
  const [measure, setMeasure] = useState({ height: "", weight: "", age: "" });
  const [advice, setAdvice] = useState<SizeAdvice | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Everything a shopper can try: this product (and each colour), then suggestions.
  const garments = useMemo<TryOnGarment[]>(() => {
    const own: TryOnGarment[] = colors.length
      ? colors.map((c) => ({ ...c, id: `${productId}:${c.color ?? c.name}`, name: `${productName} — ${c.name}` }))
      : [{ id: String(productId), name: productName, imageUrl: productImageUrl ?? null }];
    return [...own, ...suggestions.map((s) => ({ ...s, id: String(s.id) }))];
  }, [colors, suggestions, productId, productName, productImageUrl]);

  // Pre-select the colour the shopper is viewing.
  useEffect(() => {
    if (!open || picked.length) return;
    const first = garments.find((g) => g.color && g.color === selectedColor) ?? garments[0];
    if (first) setPicked([String(first.id)]);
  }, [open, garments, selectedColor, picked.length]);

  // The "Try It On" button on product cards links here with ?tryon=1.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tryon") === "1") setOpen(true);
  }, []);

  // Cancel any in-flight request when the component unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (open) listSavedLooks().then(setSaved).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const choosePhoto = useCallback((file?: File) => {
    setMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Choose an image file.");
    if (file.size > MAX_PHOTO_SIZE) return setMessage("Choose an image smaller than 10 MB.");
    setPhoto((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { blob: file, url: URL.createObjectURL(file) };
    });
    setLooks((prev) => {
      prev.forEach((l) => URL.revokeObjectURL(l.url));
      return [];
    });
    setActive(null);
    setNotEnabled(false);
  }, []);

  function togglePick(id: string) {
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_SELECTED) return cur;
      return [...cur, id];
    });
  }

  async function createLooks() {
    if (!photo || !consent || busy || !picked.length) return;
    setBusy(true);
    setMessage("");
    setNotEnabled(false);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const chosen = picked.map((id) => garments.find((g) => String(g.id) === id)).filter(Boolean) as TryOnGarment[];
    const made: Look[] = [];
    try {
      let base: Blob = photo.blob;
      for (const g of chosen) {
        const [pid] = String(g.id).split(":");
        const blob = await generateLook({ photo: base, productId: pid, color: g.color, signal: ctrl.signal });
        // Full outfit layers each garment onto the previous result.
        if (mode === "outfit") base = blob;
        made.push({ key: `${g.id}-${Date.now()}-${made.length}`, garment: g, url: URL.createObjectURL(blob), blob });
      }
    } catch (err) {
      if (err instanceof TryOnNotConfiguredError) setNotEnabled(true);
      else if (!(err instanceof DOMException && err.name === "AbortError")) {
        setMessage(err instanceof Error ? err.message : "We couldn't create this look.");
      }
    } finally {
      setBusy(false);
    }
    if (made.length) {
      setLooks((prev) => {
        prev.forEach((l) => URL.revokeObjectURL(l.url));
        return mode === "outfit" ? [made[made.length - 1]] : made;
      });
      setActive(mode === "outfit" ? made[made.length - 1].key : made[0].key);
    }
  }

  const activeLook = looks.find((l) => l.key === active) ?? null;

  async function onSave() {
    if (!activeLook) return;
    const [pid] = String(activeLook.garment.id).split(":");
    try {
      await saveLook(
        { productId: pid, productName: activeLook.garment.name, color: activeLook.garment.color },
        activeLook.blob,
      );
      setSaved(await listSavedLooks());
      setMessage("Look saved.");
    } catch {
      setMessage("Could not save this look.");
    }
  }

  async function onShare() {
    const url = window.location.href;
    const text = `Take a look at ${activeLook?.garment.name ?? productName} on LarkTribe.`;
    try {
      if (activeLook && navigator.canShare?.({ files: [new File([activeLook.blob], "look.jpg", { type: "image/jpeg" })] })) {
        await navigator.share({ title: productName, text, url, files: [new File([activeLook.blob], "look.jpg", { type: "image/jpeg" })] });
      } else if (navigator.share) {
        await navigator.share({ title: productName, text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setMessage("Product link copied. Send it to a friend.");
      } else {
        setMessage("Sharing is not available in this browser.");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setMessage("Could not share. Please try again.");
    }
  }

  async function onSize() {
    setAdvice(null);
    try {
      setAdvice(
        await fetchSizeAdvice({
          productId,
          heightCm: Number(measure.height) || undefined,
          weightKg: Number(measure.weight) || undefined,
          ageYears: Number(measure.age) || undefined,
        }),
      );
    } catch (e) {
      setAdvice({ size: null, detail: e instanceof Error ? e.message : "Size guidance is unavailable." });
    }
  }

  const canCreate = !!photo && consent && picked.length > 0 && !busy;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-stone-300 py-3 text-[11px] uppercase tracking-[0.16em] font-medium hover:border-black transition"
      >
        Try It On
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-0 sm:p-4"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="try-on-title"
            className="relative h-full w-full max-w-5xl overflow-y-auto bg-white p-5 sm:h-auto sm:max-h-[94vh] sm:p-8"
          >
            <button type="button" onClick={() => setOpen(false)} aria-label="Close virtual try-on" className="absolute right-4 top-4 p-2 text-stone-500 hover:text-black">
              <X size={20} />
            </button>

            <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500">Virtual styling studio</p>
            <h2 id="try-on-title" className="mt-2 font-editorial text-2xl sm:text-3xl">Try {productName}</h2>

            <div className="mt-4 flex gap-6 border-b border-stone-200 text-[11px] uppercase tracking-widest">
              {(["studio", "saved"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 pb-2 ${tab === t ? "border-black text-black" : "border-transparent text-stone-500"}`}
                >
                  {t === "studio" ? "Try on" : `Saved looks (${saved.length})`}
                </button>
              ))}
            </div>

            {tab === "saved" ? (
              <div className="mt-6">
                {saved.length === 0 ? (
                  <p className="text-sm text-stone-500">No saved looks yet. Create a look and tap “Save look”.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {saved.map((l) => (
                      <li key={l.id} className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={l.image} alt={l.productName} className="aspect-[3/4] w-full bg-stone-100 object-cover" />
                        <p className="mt-1 line-clamp-1 text-xs text-stone-700">{l.productName}</p>
                        <button
                          type="button"
                          aria-label="Delete saved look"
                          onClick={async () => {
                            await deleteSavedLook(l.id);
                            setSaved(await listSavedLooks());
                          }}
                          className="absolute right-1 top-1 bg-white/90 p-1.5 text-stone-600 hover:text-black"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                {/* ---------- Stage ---------- */}
                <div>
                  <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden bg-stone-100">
                    {activeLook && photo ? (
                      <BeforeAfterSlider before={photo.url} after={activeLook.url} />
                    ) : photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="Your selected photo" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                        <Upload className="mb-3 text-stone-500" size={26} />
                        <p className="text-sm font-medium">Add a full-length photo</p>
                        <p className="mt-1 text-xs text-stone-500">Front-facing, well-lit, one person.</p>
                      </div>
                    )}
                    {busy && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 text-sm" role="status">
                        <Sparkles className="mb-2 animate-pulse" size={22} />
                        Creating the look…
                      </div>
                    )}
                  </div>

                  {/* Compare styles */}
                  {photo && (looks.length > 0) && (
                    <div className="mx-auto mt-3 max-w-md">
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-stone-500">Compare styles</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        <button type="button" onClick={() => setActive(null)} className={`h-20 w-16 shrink-0 border ${active === null ? "border-black" : "border-stone-200"}`} aria-label="Original photo">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt="" className="h-full w-full object-cover" />
                        </button>
                        {looks.map((l) => (
                          <button key={l.key} type="button" onClick={() => setActive(l.key)} className={`h-20 w-16 shrink-0 border ${active === l.key ? "border-black" : "border-stone-200"}`} aria-label={l.garment.name}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.url} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ---------- Controls ---------- */}
                <div className="space-y-5">
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-700">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 accent-black" />
                    <span>
                      I own this photo or have permission from the person shown. I agree it is sent to our try-on
                      service to create a preview; it is not stored, and a look is only kept if I choose “Save look”.
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <label className={`inline-flex items-center gap-2 px-5 py-3 text-[11px] uppercase tracking-widest ${consent ? "cursor-pointer bg-black text-white hover:bg-stone-800" : "cursor-not-allowed bg-stone-200 text-stone-500"}`}>
                      <Upload size={15} />
                      {photo ? "Change photo" : "Choose a photo"}
                      <input type="file" accept="image/*" disabled={!consent} className="sr-only" onChange={(e) => { choosePhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                    </label>
                    <label className={`inline-flex items-center gap-2 border px-5 py-3 text-[11px] uppercase tracking-widest ${consent ? "cursor-pointer border-stone-300 hover:border-black" : "cursor-not-allowed border-stone-200 text-stone-400"}`}>
                      <Camera size={15} />
                      Take a photo
                      <input type="file" accept="image/*" capture="user" disabled={!consent} className="sr-only" onChange={(e) => { choosePhoto(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                    </label>
                  </div>

                  {/* Garment picker */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-widest text-stone-500">Choose up to {MAX_SELECTED}</p>
                      <div className="flex gap-3 text-[10px] uppercase tracking-widest">
                        {(["separate", "outfit"] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setMode(m)} className={mode === m ? "text-black underline underline-offset-4" : "text-stone-500"}>
                            {m === "separate" ? "Compare looks" : "Full outfit"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {garments.map((g) => {
                        const id = String(g.id);
                        const on = picked.includes(id);
                        return (
                          <button key={id} type="button" onClick={() => togglePick(id)} aria-pressed={on} title={g.name} className={`relative h-20 w-16 shrink-0 border bg-stone-50 ${on ? "border-black" : "border-stone-200"}`}>
                            {g.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={g.imageUrl} alt={g.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="p-1 text-[9px]">{g.name}</span>
                            )}
                            {on && <span className="absolute right-0 top-0 bg-black px-1 text-[10px] leading-4 text-white">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    {mode === "outfit" && (
                      <p className="mt-1 text-[11px] text-stone-500">Items are layered in the order you pick them.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!canCreate}
                    onClick={createLooks}
                    className="inline-flex w-full items-center justify-center gap-2 bg-black px-5 py-3 text-[11px] uppercase tracking-widest text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                  >
                    <Sparkles size={15} />
                    {busy ? "Creating…" : looks.length ? "Create again" : "Create my look"}
                  </button>
                  {!photo && <p className="text-xs text-stone-500">Confirm permission and add a photo to continue.</p>}

                  {notEnabled && (
                    <div role="status" className="border-l-2 border-stone-300 bg-stone-50 p-4 text-xs leading-relaxed text-stone-600">
                      <p className="mb-1 text-sm font-medium text-stone-800">Try-on preview is coming soon</p>
                      AI try-on is in pilot setup and not switched on yet, so nothing was uploaded. Your photo stays on this device.
                    </div>
                  )}
                  {message && <p role="status" className="text-sm text-stone-700">{message}</p>}

                  {activeLook && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={onSave} className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2.5 text-[11px] uppercase tracking-widest hover:border-black"><Heart size={14} />Save look</button>
                      <button type="button" onClick={onShare} className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2.5 text-[11px] uppercase tracking-widest hover:border-black"><Share2 size={14} />Share</button>
                      <a href={activeLook.url} download="larktribe-look.jpg" className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2.5 text-[11px] uppercase tracking-widest hover:border-black"><Download size={14} />Download</a>
                    </div>
                  )}

                  {/* Size guidance */}
                  {hasSizeGuide && (
                    <details className="border-t border-stone-200 pt-4">
                      <summary className="flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-widest"><Ruler size={14} />Size guidance</summary>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {([["height", "Height (cm)"], ["weight", "Weight (kg)"], ["age", "Age (yrs)"]] as const).map(([k, label]) => (
                          <label key={k} className="text-[10px] uppercase tracking-wider text-stone-500">
                            {label}
                            <input inputMode="decimal" value={measure[k]} onChange={(e) => setMeasure((m) => ({ ...m, [k]: e.target.value }))} className="mt-1 w-full border border-stone-300 px-2 py-2 text-sm normal-case tracking-normal text-black" />
                          </label>
                        ))}
                      </div>
                      <button type="button" onClick={onSize} className="mt-3 border border-black px-4 py-2 text-[11px] uppercase tracking-widest hover:bg-black hover:text-white">Suggest a size</button>
                      {advice && (
                        <p role="status" className="mt-3 text-sm">
                          {advice.size ? <>Suggested size: <strong>{advice.size}</strong></> : advice.detail}
                          <span className="mt-1 block text-xs text-stone-500">{advice.note ?? "Guidance only — not a guarantee of fit."}</span>
                        </p>
                      )}
                    </details>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
