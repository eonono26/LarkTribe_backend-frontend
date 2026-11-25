"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { features, type TryOnLook } from "@/lib/features-api";

export default function MyLooksPage() {
  const [looks, setLooks] = useState<TryOnLook[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { features.myLooks().then(setLooks).catch(() => { setError("Sign in to see your saved looks."); setLooks([]); }); }, []);

  async function remove(id: number) {
    await features.tryOnDelete(id).catch(() => {});
    setLooks((l) => (l || []).filter((x) => x.id !== id));
  }

  return (
    <main className="container-shell py-10">
      <h1 className="text-[13px] tracking-[0.08em] font-editorial mb-1">My Looks</h1>
      <p className="text-sm text-stone-500 mb-8">Virtual try-ons you&apos;ve saved. Delete any look and it&apos;s removed from our servers.</p>
      {looks === null ? <p className="text-sm text-stone-400">Loading…</p> : looks.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-stone-200">
          <p className="text-sm text-stone-600">{error || "No saved looks yet. Tap “Try it on” on any product."}</p>
          <Link href={error ? "/login?next=/account/looks" : "/shop"} className="inline-block mt-4 text-[11px] uppercase tracking-widest underline underline-offset-4">{error ? "Sign in" : "Browse"}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {looks.map((l) => (
            <div key={l.id} className="group">
              <Link href={`/product/${l.product_slug}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.result_url!} alt={l.product_name} className="w-full aspect-[3/4] object-cover" />
              </Link>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] uppercase tracking-wider truncate">{l.product_name}</span>
                <button onClick={() => remove(l.id)} aria-label="Delete look" className="text-stone-400 hover:text-black"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
