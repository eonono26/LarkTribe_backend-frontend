"use client";

import { useRef, useState, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLocalization } from "@/lib/localization-context";

/** Standalone language switcher, kept for use outside the main Header (e.g. in
 * a footer or a settings page). Reads/writes the same shared LocalizationProvider
 * as the Header's own dropdown, so a change here is reflected everywhere. */
export default function LanguageSwitcher() {
  const { language, languages, setLanguage } = useLocalization();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs font-semibold hover:opacity-70">
        <Globe size={18} />
        <span className="hidden sm:inline">{language.native_name}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-mist)] ${l.code === language.code ? "font-semibold" : ""}`}
            >
              {l.native_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
