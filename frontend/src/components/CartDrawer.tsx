"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateItem, removeItem } = useCart();
  const { formatPrice } = useLocalization();

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-sm bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-line)]">
          <h2 className="font-display font-bold text-lg">Your bag</h2>
          <button onClick={closeDrawer} aria-label="Close cart">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!cart || cart.items.length === 0 ? (
            <p className="text-sm text-neutral-500 mt-8 text-center">Your bag is empty. Add something you love.</p>
          ) : (
            cart.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative w-16 h-20 bg-[var(--color-mist)] rounded shrink-0 overflow-hidden">
                  {item.product.image && (
                    <Image src={mediaUrl(item.product.image)} alt={item.product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{item.product.name}</p>
                  <p className="text-sm font-bold mt-1">{formatPrice(item.product.price)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                      className="border border-[var(--color-line)] rounded p-1"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      className="border border-[var(--color-line)] rounded p-1"
                    >
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="ml-auto text-neutral-400 hover:text-[var(--color-flag)]">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="p-4 border-t border-[var(--color-line)] space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-bold">{formatPrice(cart.total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block text-center bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide py-3 rounded-full"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
