"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Clock } from "lucide-react";
import { api } from "@/lib/api";

const TRENDING = ["Ankara dresses", "Baby diapers", "Skincare set", "Maternity wear", "Kids sneakers"];

export default function SearchBar({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setRecent(JSON.parse(localStorage.getItem("duka_recent_searches") || "[]"));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.smartSearch(query)
        .then((r) => {
          const names = Array.from(new Set(r.results.map((p) => p.name))).slice(0, 6);
          setSuggestions(names);
        })
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function runSearch(term: string) {
    if (!term.trim()) return;
    const next = [term, ...recent.filter((r) => r !== term)].slice(0, 6);
    setRecent(next);
    localStorage.setItem("duka_recent_searches", JSON.stringify(next));
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
        className="flex items-center gap-2 bg-[var(--color-mist)] rounded-full px-4 py-2.5">
        <Search size={18} className="text-neutral-500 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search dresses, skincare, baby gear…"
          className="bg-transparent w-full outline-none text-sm placeholder:text-neutral-500"
        />
      </form>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-2xl shadow-lg overflow-hidden z-50">
          {query.trim() && suggestions.length > 0 && (
            <ul className="py-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button onClick={() => runSearch(s)} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-mist)] flex items-center gap-2">
                    <Search size={14} className="text-neutral-400" /> {s}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!query.trim() && recent.length > 0 && (
            <div className="py-2 border-b border-[var(--color-line)]">
              <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Recent</p>
              {recent.map((s) => (
                <button key={s} onClick={() => runSearch(s)} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-mist)] flex items-center gap-2">
                  <Clock size={14} className="text-neutral-400" /> {s}
                </button>
              ))}
            </div>
          )}

          {!query.trim() && (
            <div className="py-2">
              <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Trending</p>
              {TRENDING.map((s) => (
                <button key={s} onClick={() => runSearch(s)} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-mist)] flex items-center gap-2">
                  <TrendingUp size={14} className="text-neutral-400" /> {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}