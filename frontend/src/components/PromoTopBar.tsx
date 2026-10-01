"use client";

import { useState } from "react";
import { X, ChevronDown } from "lucide-react";

/**
 * AnnouncementBar — matches the approved "Lark Tribe" editorial design
 * exactly: dark stone-950 strip, currency/region selector on the left,
 * centered promo ticker, client-services/showroom links + dismiss on the
 * right. Replaces the old rotating-message PromoTopBar look.
 */
export default function PromoTopBar() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      className="bg-stone-950 text-stone-300 text-xs py-2.5 px-4 tracking-wider uppercase font-medium border-b border-stone-800/80 font-sans"
      data-purpose="global-announcement"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Currency & Region Selector */}
        <div className="hidden md:flex items-center space-x-4 text-[11px] text-stone-400">
          <button
            type="button"
            className="hover:text-white transition flex items-center gap-1.5 focus:outline-none"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Kenya (KES)</span>
            <ChevronDown className="w-3 h-3 text-stone-400" strokeWidth={2} />
          </button>
          <span className="text-stone-700">|</span>
          <span className="tracking-normal normal-case">
            Code: <strong className="text-white font-semibold">TRIBE10</strong> for 10% Off
          </span>
        </div>

        {/* Ticker Message */}
        <div className="flex-1 text-center truncate px-3 text-[11px] tracking-widest text-stone-200">
          Sign up today &amp; receive 10% off your first curation • Complimentary delivery on orders KES 15,000+
        </div>

        {/* Actions & Support */}
        <div className="hidden lg:flex items-center space-x-5 text-[11px] text-stone-400">
          <a className="hover:text-white transition" href="/contact">
            Client Services
          </a>
          <a className="hover:text-white transition" href="/help">
            Showrooms
          </a>
          <button
            aria-label="Dismiss Announcement"
            onClick={() => setDismissed(true)}
            className="text-stone-500 hover:text-stone-300 transition"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
