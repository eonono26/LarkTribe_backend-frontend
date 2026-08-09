"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { mediaUrl, formatKES } from "@/lib/api";

export default function CartPage() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function changeQty(itemId: number, next: number) {
    if (next < 1) return;
    setBusyId(itemId);
    try {
      await updateItem(itemId, next);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(itemId: number) {
    setBusyId(itemId);
    try {
      await removeItem(itemId);
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="container-shell py-20 text-center">
        <p className="text-neutral-400">Loading your bag…</p>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="container-shell py-24 text-center max-w-md mx-auto">
        <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-[var(--color-mist)] flex items-center justify-center">
          <ShoppingBag size={28} className="text-neutral-400" />
        </div>
        <h1 className="font-display text-2xl font-black mb-2">Your bag is empty</h1>
        <p className="text-neutral-500 mb-8">
          Browse departments and add something you love — it&apos;ll show up here.
        </p>
        <Link
          href="/"
          className="inline-block bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide px-8 py-3.5 rounded-full"
        >
          Start shopping
        </Link>
      </main>
    );
  }

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <main className="container-shell py-10 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl md:text-3xl font-black mb-1">Your bag</h1>
      <p className="text-sm text-neutral-500 mb-8">
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </p>

      <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        {cart.items.map((item) => {
          const busy = busyId === item.id;
          return (
            <li key={item.id} className="py-5 flex gap-4">
              <Link
                href={`/product/${item.product.slug}`}
                className="relative shrink-0 h-24 w-20 rounded-lg overflow-hidden bg-[var(--color-mist)]"
              >
                {item.product.image ? (
                  <Image
                    src={mediaUrl(item.product.image)}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-neutral-400 text-[10px]">
                    No image
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-500 truncate">
                      {item.product.vendor_name}
                    </p>
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-sm font-semibold leading-snug line-clamp-2 hover:underline"
                    >
                      {item.product.name}
                    </Link>
                  </div>
                  <span className="font-bold shrink-0 whitespace-nowrap">
                    {formatKES(item.subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 bg-[var(--color-mist)] rounded-full px-1 py-1">
                    <button
                      aria-label="Decrease quantity"
                      disabled={busy}
                      onClick={() => changeQty(item.id, item.quantity - 1)}
                      className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      disabled={busy}
                      onClick={() => changeQty(item.id, item.quantity + 1)}
                      className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    aria-label="Remove item"
                    disabled={busy}
                    onClick={() => handleRemove(item.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-[var(--color-flag)] disabled:opacity-40 transition-colors"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 max-w-sm ml-auto space-y-2">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>Subtotal</span>
          <span>{formatKES(cart.total)}</span>
        </div>
        <p className="text-xs text-neutral-500">Delivery and coupons are calculated at checkout.</p>
        <div className="flex justify-between items-center pt-2 border-t border-[var(--color-line)]">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-lg">{formatKES(cart.total)}</span>
        </div>

        <Link
          href="/checkout"
          className="flex items-center justify-center gap-2 bg-[var(--color-signal)] text-[var(--color-ink)] font-bold uppercase text-sm tracking-wide py-4 rounded-full mt-4"
        >
          Checkout
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/"
          className="block text-center text-sm font-semibold underline text-neutral-600 mt-2"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
