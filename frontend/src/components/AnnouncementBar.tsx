"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLocalization } from "@/lib/localization-context";

/**
 * AnnouncementBar — the dark ticker strip above the main header, matching
 * the Stitch design: currency indicator on the left (desktop), a centered
 * promo message, and quick links + dismiss on the right (desktop). Kept
 * intentionally simple on mobile (message only) so it doesn't compete with
 * the hamburger/search/logo row beneath it.
 */
export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  const { currencyCode } = useLocalization();

  if (dismissed) return null;

  return (
    <div className="bg-stone-950 text-stone-300 text-[11px] py-2.5 px-4 tracking-wider uppercase font-medium border-b border-stone-800/80 font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="hidden md:flex items-center space-x-4 text-stone-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>{currencyCode || "KES"}</span>
          </span>
          <span className="text-stone-700">|</span>
          <span className="tracking-normal normal-case">
            Code: <strong className="text-white font-semibold">TRIBE10</strong> for 10% Off
          </span>
        </div>

        <div className="flex-1 text-center truncate px-1 sm:px-3 text-stone-200">
          Sign up today &amp; receive 10% off your first order • Complimentary shipping on orders $150+
        </div>

        <div className="hidden lg:flex items-center space-x-5 text-stone-400 shrink-0">
          <a className="hover:text-white transition" href="/contact">
            Client Services
          </a>
          <a className="hover:text-white transition" href="/delivery">
            Showrooms
          </a>
          <button
            aria-label="Dismiss announcement"
            onClick={() => setDismissed(true)}
            className="text-stone-500 hover:text-stone-300 transition"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
