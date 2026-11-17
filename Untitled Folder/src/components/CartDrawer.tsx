"use client";

import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { mediaUrl } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import VariantBadge from "@/components/VariantBadge";

export default function CartDrawer() {
  const { cart, drawerOpen, closeDrawer, updateItem, removeItem } = useCart();
  const { formatPrice } = useLocalization();
  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <h2 className="font-editorial text-xl">Your Bag</h2>
          <button onClick={closeDrawer} aria-label="Close"><X size={20} strokeWidth={1.5} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!cart || cart.items.length === 0 ? (
            <p className="text-sm text-stone-500 text-center mt-10">Your bag is empty.</p>
          ) : (
            cart.items.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="relative w-20 h-24 bg-stone-100 shrink-0 overflow-hidden">
                  {(item.image || item.product.image) && (
                    <Image src={mediaUrl(item.image || item.product.image)} alt={item.product.name} fill className="object-cover" sizes="80px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.product.slug}`} className="text-sm font-medium line-clamp-2 hover:underline">{item.product.name}</Link>
                  {item.variant && <VariantBadge color={item.variant.color} size={item.variant.size} className="text-xs text-stone-500 mt-0.5" />}
                  <p className="text-sm mt-1">{formatPrice(item.product.price)}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-stone-300 h-8">
                      <button onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))} className="w-7 h-full flex items-center justify-center hover:bg-stone-50"><Minus size={12} /></button>
                      <span className="w-5 text-center text-xs">{item.quantity}</span>
                      <button onClick={() => updateItem(item.id, item.quantity + 1)} className="w-7 h-full flex items-center justify-center hover:bg-stone-50"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-[11px] underline text-stone-500 hover:text-black">Remove</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart && cart.items.length > 0 && (
          <div className="p-5 border-t border-stone-200 space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal</span>
              <span>{formatPrice(cart.total)}</span>
            </div>
            <Link href="/checkout" onClick={closeDrawer} className="block w-full text-center py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-medium hover:bg-stone-800 transition">Checkout</Link>
            <button onClick={closeDrawer} className="block w-full text-center text-[11px] uppercase tracking-widest text-stone-500 hover:text-black pt-1">Continue Shopping</button>
          </div>
        )}
      </aside>
    </div>
  );
}