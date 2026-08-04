"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatKES } from "@/lib/api";

export default function CartPage() {
  const { cart } = useCart();

  return (
    <main className="container-shell py-10 max-w-lg mx-auto">
      <h1 className="font-display text-2xl font-black mb-6">Your bag</h1>
      {!cart || cart.items.length === 0 ? (
        <p className="text-neutral-500">Your bag is empty.</p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--color-line)]">
            {cart.items.map((item) => (
              <li key={item.id} className="py-3 flex justify-between text-sm">
                <span>{item.product.name} × {item.quantity}</span>
                <span className="font-semibold">{formatKES(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between mt-4 font-bold">
            <span>Total</span>
            <span>{formatKES(cart.total)}</span>
          </div>
          <Link href="/checkout" className="block text-center bg-[var(--color-ink)] text-white font-semibold uppercase text-sm tracking-wide py-3 rounded-full mt-6">
            Checkout
          </Link>
        </>
      )}
    </main>
  );
}
