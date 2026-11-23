"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { features } from "@/lib/features-api";
import { MARKETING_CONSENT_KEY } from "@/lib/tracking";

/** Cookie consent for ad pixels. Only appears when Meta/TikTok pixels are configured. */
export default function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    try {
      if (localStorage.getItem(MARKETING_CONSENT_KEY)) return;
    } catch { return; }
    features.publicConfig().then((c) => {
      if (alive && (c.meta_pixel_id || c.tiktok_pixel_id)) setShow(true);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!show) return null;

  const choose = (v: "granted" | "denied") => {
    try { localStorage.setItem(MARKETING_CONSENT_KEY, v); } catch { /* ignore */ }
    setShow(false);
    window.dispatchEvent(new Event("lt-consent"));
  };

  return (
    <div role="dialog" aria-label="Cookie preferences" className="fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-stone-300 px-4 py-4 sm:px-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-8">
        <p className="text-xs text-stone-600 leading-relaxed flex-1">
          We use cookies from Meta and TikTok to measure our ads and show you relevant offers. Essential cookies always stay on.{" "}
          <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => choose("denied")} className="px-5 py-2.5 border border-stone-300 text-[11px] uppercase tracking-widest hover:border-black transition">Decline</button>
          <button onClick={() => choose("granted")} className="px-5 py-2.5 bg-black text-white text-[11px] uppercase tracking-widest hover:bg-stone-800 transition">Accept</button>
        </div>
      </div>
    </div>
  );
}
