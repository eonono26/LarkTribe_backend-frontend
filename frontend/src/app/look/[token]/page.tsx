"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { features, type TryOnLook } from "@/lib/features-api";

export default function SharedLookPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [look, setLook] = useState<TryOnLook | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => { features.sharedLook(token).then(setLook).catch(() => setMissing(true)); }, [token]);

  if (missing) return <main className="container-shell py-24 text-center"><p className="font-editorial text-2xl mb-2">This look is no longer shared.</p><Link href="/shop" className="text-[11px] uppercase tracking-widest underline">Shop LarkTribe</Link></main>;
  if (!look) return <main className="container-shell py-24 text-center text-sm text-stone-400">Loading…</main>;

  return (
    <main className="container-shell py-10 max-w-md mx-auto">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 mb-1">A LarkTribe look</p>
      <h1 className="font-editorial text-2xl mb-4">{look.product_name}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={look.result_url!} alt={`Virtual try-on of ${look.product_name}`} className="w-full aspect-[3/4] object-cover" />
      <p className="text-[11px] text-stone-400 mt-2">AI-generated preview.</p>
      <Link href={`/product/${look.product_slug}`} className="block mt-5 py-3.5 bg-black text-white text-center text-[11px] uppercase tracking-widest">Shop this look</Link>
    </main>
  );
}
