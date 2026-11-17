"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { X, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import VariantBadge from "@/components/VariantBadge";
import RecommendedRow from "@/components/RecommendedRow";
import { apiErrorMessage } from "@/lib/api";

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const { formatPrice } = useLocalization();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeQty(itemId: number, next: number) {
    if (next < 1) return;
    setBusyId(itemId);
    setError(null);
    try {
      await updateItem(itemId, next);
    } catch (e) {
      setError(apiErrorMessage(e, "Couldn't update quantity."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(itemId: number) {
    setBusyId(itemId);
    try { await removeItem(itemId); } finally { setBusyId(null); }
  }

  if (isLoading) return <main className="bg-white py-32 text-center text-stone-400 text-sm">Loading…</main>;

  if (!cart || cart.items.length === 0) {
    return (
      <main className="bg-white min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <ShoppingBag size={32} className="mx-auto mb-4 text-stone-300" strokeWidth={1.5} />
          <h1 className="font-editorial text-2xl mb-2">Your Bag is Empty</h1>
          <p className="text-sm text-stone-500 mb-8">Add something you love.</p>
          <Link href="/shop" className="inline-block px-8 py-3 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition">Continue Shopping</Link>
        </div>
        <RecommendedRow title="Recommended For You" kind="recommended" />
      </main>
    );
  }

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = parseFloat(cart.total) || 0;

  return (
    <main className="bg-white text-black font-sans min-h-screen">
      <div className="container-shell py-10 lg:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <h1 className="font-editorial text-3xl">Shopping Bag</h1>
            <span className="text-[11px] uppercase tracking-widest text-stone-500">{itemCount} {itemCount === 1 ? "Item" : "Items"}</span>
          </div>

          {error && <p className="mb-6 text-sm text-red-700 bg-red-50 px-4 py-3">{error}</p>}

          <ul className="border-t border-stone-200">
            {cart.items.map(item => {
              const busy = busyId === item.id;
              return (
                <li key={item.id} className="py-6 flex gap-5 border-b border-stone-200">
                  <Link href={`/product/${item.product.slug}`} className="relative shrink-0 w-24 h-32 bg-stone-100 overflow-hidden">
                    {item.image || item.product.image ? (
                      <Image src={mediaUrl(item.image || item.product.image)} alt={item.product.name} fill className="object-cover" sizes="96px" />
                    ) : <div className="w-full h-full bg-stone-100" />}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between gap-3">
                      <div>
                        <Link href={`/product/${item.product.slug}`} className="text-[15px] font-medium hover:underline leading-snug line-clamp-2">{item.product.name}</Link>
                        {item.variant && <VariantBadge color={item.variant.color} size={item.variant.size} className="text-xs text-stone-500 mt-1" />}
                      </div>
                      <button aria-label="Remove" disabled={busy} onClick={() => handleRemove(item.id)} className="text-stone-400 hover:text-black transition shrink-0 h-fit"><X size={16} /></button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-stone-300 h-9">
                        <button aria-label="Decrease" disabled={busy} onClick={() => changeQty(item.id, item.quantity - 1)} className="w-8 h-full flex items-center justify-center hover:bg-stone-50 text-sm">−</button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button aria-label="Increase" disabled={busy} onClick={() => changeQty(item.id, item.quantity + 1)} className="w-8 h-full flex items-center justify-center hover:bg-stone-50 text-sm">+</button>
                      </div>
                      <span className="text-sm font-medium">{formatPrice(item.subtotal)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-10 max-w-sm ml-auto space-y-3">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-stone-200">
              <span className="font-editorial text-xl">Total</span>
              <span className="font-editorial text-2xl">{formatPrice(cart.total)}</span>
            </div>

            <Link href="/checkout" className="w-full mt-4 inline-flex items-center justify-center px-6 py-4 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition">
              Checkout
            </Link>
            <Link href="/shop" className="block text-center text-[11px] uppercase tracking-widest text-stone-500 hover:text-black pt-2 transition">Continue Shopping</Link>
          </div>
        </div>
      </div>
      <RecommendedRow title="Recommended For You" kind="recommended" />
    </main>
  );
}