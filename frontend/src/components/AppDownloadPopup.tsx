"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Smartphone } from "lucide-react";

const STORAGE_KEY = "lt_app_download_popup_seen";
const SHOW_AFTER_MS = 1200;

/**
 * Popup shown when someone opens the site, prompting them to download the
 * Lark Tribe mobile app. Shows once per browser (localStorage flag) — not
 * once per page load — so it doesn't nag on every navigation.
 */
export default function AppDownloadPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // localStorage unavailable — treat as not seen.
    }
    if (alreadySeen) return;

    const timer = setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-[fadeIn_0.25s_ease-out]">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 p-1.5 rounded-full hover:bg-[var(--color-mist)] transition-colors duration-200"
        >
          <X size={18} strokeWidth={2} className="text-neutral-500" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-ink)] flex items-center justify-center">
            <Smartphone size={26} className="text-white" strokeWidth={1.75} />
          </div>
          <h2 className="font-display text-lg font-black">Get the Lark Tribe app</h2>
          <p className="text-sm text-neutral-500">
            Faster checkout, order tracking, and app-only offers — right on your phone.
          </p>

          <div className="flex flex-col w-full gap-2 mt-2">
            <Link
              href="/download"
              onClick={close}
              className="btn btn-ink btn-block"
            >
              Download App
            </Link>
            <button
              onClick={close}
              className="w-full text-center text-sm font-semibold text-neutral-500 py-2 hover:text-[var(--color-ink)] transition-colors duration-200"
            >
              Continue on website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
