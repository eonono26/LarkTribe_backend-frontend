"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Check, Copy, Heart, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { auth, isLoggedIn } from "@/lib/auth";
import { features, type TryOnConfig, type TryOnLook } from "@/lib/features-api";
import { trackEvent } from "@/lib/tracking";
import { mediaUrl } from "@/lib/api";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ColorSwatch from "@/components/ColorSwatch";
import type { ProductListItem } from "@/lib/types";

export interface TryOnProduct {
  id: number | string;
  name: string;
  slug: string;
  colors?: string[];
}

interface Props {
  product: TryOnProduct;
  initialColor?: string | null;
  /** Other products the shopper can add to the same preview (mix & match / full outfit). */
  companions?: ProductListItem[];
  onClose: () => void;
}

interface Render { look: TryOnLook; color: string; label: string }

const POLL_MS = 2000;
const MAX_POLLS = 60; // ~2 minutes

export default function TryOnModal({ product, initialColor, companions = [], onClose }: Props) {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [cfg, setCfg] = useState<TryOnConfig | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [useProfile, setUseProfile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [color, setColor] = useState<string>(initialColor || product.colors?.[0] || "");
  const [extra, setExtra] = useState<number[]>([]);
  const [phase, setPhase] = useState<"setup" | "working" | "result">("setup");
  const [error, setError] = useState("");
  const [renders, setRenders] = useState<Render[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    setLoggedIn(isLoggedIn());
    features.tryOnConfig().then(setCfg).catch(() => {});
    if (isLoggedIn()) {
      auth.me().then((u) => setProfilePhoto((u as { profile_picture_url?: string | null }).profile_picture_url || null)).catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelled.current = true;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const beforeSrc = preview || (useProfile && profilePhoto ? mediaUrl(profilePhoto) : null);

  const run = useCallback(async (forColor: string) => {
    setError("");
    if (!consent) { setError("Please agree to photo processing to continue."); return; }
    if (!file && !(useProfile && profilePhoto)) { setError("Add a photo of yourself first."); return; }
    setPhase("working");
    try {
      const fd = new FormData();
      fd.append("product", String(product.id));
      fd.append("consent", "true");
      if (forColor) fd.append("color", forColor);
      extra.forEach((id) => fd.append("extra_products", String(id)));
      if (file) fd.append("photo", file); else fd.append("use_profile_photo", "true");
      let look = await features.tryOnCreate(fd);
      for (let i = 0; i < MAX_POLLS && (look.status === "pending" || look.status === "processing"); i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (cancelled.current) return;
        look = await features.tryOnGet(look.id);
      }
      if (look.status !== "done" || !look.result_url) {
        throw new Error(look.error || "We couldn't create your preview. Please try again with a clearer photo.");
      }
      const label = [forColor, ...look.outfit.map((o) => o.name)].filter(Boolean).join(" + ") || product.name;
      setRenders((r) => { setActiveIdx(r.length); return [...r, { look, color: forColor, label }]; });
      setPhase("result");
      trackEvent("TryOn", { id: product.id, name: product.name });
    } catch (e) {
      if (cancelled.current) return;
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase(renders.length ? "result" : "setup");
    }
  }, [consent, file, useProfile, profilePhoto, product.id, product.name, extra, renders.length]);

  const active = renders[activeIdx];

  async function toggleSave() {
    if (!active) return;
    const updated = await features.tryOnSave(active.look.id, !active.look.is_saved).catch(() => null);
    if (updated) setRenders((rs) => rs.map((r, i) => (i === activeIdx ? { ...r, look: updated } : r)));
  }

  async function share() {
    if (!active) return;
    try {
      const updated = await features.tryOnShare(active.look.id, true);
      setRenders((rs) => rs.map((r, i) => (i === activeIdx ? { ...r, look: updated } : r)));
      const url = `${window.location.origin}${updated.share_path}`;
      if (navigator.share) {
        await navigator.share({ title: `My look: ${product.name}`, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { setError("Couldn't create a share link."); }
  }

  async function remove() {
    if (!active) return;
    await features.tryOnDelete(active.look.id).catch(() => {});
    const next = renders.filter((_, i) => i !== activeIdx);
    setRenders(next);
    setActiveIdx(0);
    if (!next.length) setPhase("setup");
  }

  const toggleExtra = (id: number) =>
    setExtra((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 2 ? cur : [...cur, id]));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label="Virtual try-on">
      <div className="bg-white w-full max-w-5xl max-h-[94vh] overflow-y-auto relative " onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 z-10 p-2 bg-white/90 hover:bg-white"><X size={18} /></button>

        <div className="p-5 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">AI Virtual Try-On</p>
          <h2 className="text-[13px] tracking-[0.08em] font-editorial mb-1 pr-8">{product.name}</h2>

          {!loggedIn ? (
            <div className="py-10 text-center">
              <p className="text-sm text-stone-600 mb-5 max-w-sm mx-auto">Sign in to try this on with your own photo. Your looks are saved to your account.</p>
              <Link href={`/login?next=${encodeURIComponent(pathname || "/")}`} className="inline-block px-8 py-3 bg-black text-white text-[11px] uppercase tracking-widest">Sign in</Link>
            </div>
          ) : phase === "working" ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto animate-spin mb-4" size={28} />
              <p className="text-[13px] tracking-[0.08em] font-editorial text-lg">Creating your look…</p>
              <p className="text-xs text-stone-500 mt-2">This usually takes 10–30 seconds.</p>
            </div>
          ) : phase === "result" && active ? (
            <div className="grid sm:grid-cols-2 gap-6 mt-4">
              <div>
                {showOriginal && beforeSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeSrc} alt="Original photo" className="w-full aspect-[3/4] object-cover" />
                ) : beforeSrc ? <BeforeAfterSlider before={beforeSrc} after={active.look.result_url!} /> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={active.look.result_url!} alt="Try-on preview" className="w-full aspect-[3/4] object-cover" />
                )}
                <p className="text-[11px] text-stone-500 mt-2">{cfg && !cfg.photorealistic ? "Demo preview — photoreal rendering turns on once the AI provider is connected." : "AI-generated preview. Real fit and colour may vary slightly."}</p>
              </div>

              <div className="flex flex-col gap-4">
                {/* Try-on results grid (Ello-style): original + every look, same shopper */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Try-on results</p>
                    <span className="text-[10px] px-2 py-1 border border-stone-200 rounded-none text-stone-600">Same shopper</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {beforeSrc && (
                      <button onClick={() => setShowOriginal(true)} className={`text-left border ${showOriginal ? "border-blue-600 ring-1 ring-blue-600" : "border-stone-200"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={beforeSrc} alt="Original photo" className="w-full aspect-[3/4] object-cover" />
                        <span className="block text-[10px] text-center py-1">Original Photo</span>
                      </button>
                    )}
                    {renders.map((r, i) => (
                      <button key={r.look.id} onClick={() => { setActiveIdx(i); setShowOriginal(false); }} title={r.label}
                        className={`relative text-left border ${!showOriginal && i === activeIdx ? "border-blue-600 ring-1 ring-blue-600" : "border-stone-200"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.look.result_url!} alt={r.label} className="w-full aspect-[3/4] object-cover" />
                        {!showOriginal && i === activeIdx && <Check size={14} className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5" />}
                        <span className="block text-[10px] text-center py-1 truncate px-1">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(product.colors?.length ?? 0) > 1 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Try another colour</p>
                    <div className="flex gap-2 flex-wrap">
                      {product.colors!.map((c) => (
                        <ColorSwatch key={c} color={c} size={26} shape="round" selected={color === c} onClick={() => { setColor(c); run(c); }} />
                      ))}
                    </div>
                  </div>
                )}

                {companions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Add to the outfit (up to 2)</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {companions.slice(0, 6).map((c) => (
                        <button key={c.id} onClick={() => toggleExtra(Number(c.id))} title={c.name}
                          className={`relative shrink-0 w-14 border ${extra.includes(Number(c.id)) ? "border-black" : "border-stone-200"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl(c.image || c.image_url || "")} alt={c.name} className="w-full aspect-[3/4] object-cover" />
                          {extra.includes(Number(c.id)) && <Check size={12} className="absolute top-0.5 right-0.5 bg-black text-white p-0.5" />}
                        </button>
                      ))}
                    </div>
                    {extra.length > 0 && (
                      <button onClick={() => run(color)} className="mt-2 text-[11px] uppercase tracking-widest underline underline-offset-4">Preview full outfit</button>
                    )}
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <button onClick={toggleSave} className="flex items-center gap-1.5 px-4 py-2.5 border border-stone-300 text-[11px] uppercase tracking-widest hover:border-black transition">
                    <Heart size={14} className={active.look.is_saved ? "fill-black" : ""} /> {active.look.is_saved ? "Saved" : "Save look"}
                  </button>
                  <button onClick={share} className="flex items-center gap-1.5 px-4 py-2.5 border border-stone-300 text-[11px] uppercase tracking-widest hover:border-black transition">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Link copied" : "Share"}
                  </button>
                  <button onClick={remove} className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] uppercase tracking-widest text-stone-500 hover:text-black" aria-label="Delete this look">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
                <button onClick={onClose} className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest hover:bg-stone-800 transition">Continue shopping</button>
                {error && <p className="text-xs text-red-700">{error}</p>}
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6 mt-4">
              <label className="relative block aspect-[3/4] bg-stone-50 border border-dashed border-stone-300 hover:border-black transition cursor-pointer overflow-hidden">
                {beforeSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeSrc} alt="Your photo" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-stone-500">
                    <Camera size={26} strokeWidth={1.4} className="mb-3" />
                    <span className="text-sm text-black">Upload a photo</span>
                    <span className="text-xs mt-1">Full-length, facing the camera, good light, plain background works best</span>
                  </span>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                  onChange={(e) => { setFile(e.target.files?.[0] || null); setUseProfile(false); }} />
              </label>

              <div className="flex flex-col gap-4">
                {profilePhoto && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={useProfile} onChange={(e) => { setUseProfile(e.target.checked); if (e.target.checked) setFile(null); }} />
                    Use my profile photo
                  </label>
                )}

                {(product.colors?.length ?? 0) > 1 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Colour <span className="text-black ml-1">{color}</span></p>
                    <div className="flex gap-2 flex-wrap">
                      {product.colors!.map((c) => <ColorSwatch key={c} color={c} size={26} shape="round" selected={color === c} onClick={() => setColor(c)} />)}
                    </div>
                  </div>
                )}

                {companions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Complete the outfit (optional)</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {companions.slice(0, 6).map((c) => (
                        <button key={c.id} type="button" onClick={() => toggleExtra(Number(c.id))} title={c.name}
                          className={`relative shrink-0 w-14 border ${extra.includes(Number(c.id)) ? "border-black" : "border-stone-200"}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mediaUrl(c.image || c.image_url || "")} alt={c.name} className="w-full aspect-[3/4] object-cover" />
                          {extra.includes(Number(c.id)) && <Check size={12} className="absolute top-0.5 right-0.5 bg-black text-white p-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-2 text-xs text-stone-600 leading-relaxed">
                  <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>
                    <ShieldCheck size={13} className="inline -mt-0.5 mr-1" />
                    I agree to LarkTribe processing my photo with an AI service to create this preview. {cfg?.privacy_notice}
                  </span>
                </label>

                {error && <p className="text-xs text-red-700">{error}</p>}
                <button onClick={() => run(color)} disabled={!consent || (!file && !(useProfile && profilePhoto))}
                  className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest hover:bg-stone-800 transition disabled:opacity-40">
                  Try it on
                </button>
                {cfg && <p className="text-[10px] text-stone-400">{cfg.daily_limit} previews per day · max {cfg.max_upload_mb} MB</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
