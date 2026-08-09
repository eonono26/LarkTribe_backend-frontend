"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Kiswahili" },
];

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(localStorage.getItem("duka_lang") || "en");
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(code: string) {
    setLang(code);
    localStorage.setItem("duka_lang", code);
    setOpen(false);
    // hook this into your i18n setup (next-intl / next-i18next) when ready
  }

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs font-semibold hover:opacity-70">
        <Globe size={18} />
        <span className="hidden sm:inline">{current?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px]">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => select(l.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-mist)] ${l.code === lang ? "font-semibold" : ""}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}