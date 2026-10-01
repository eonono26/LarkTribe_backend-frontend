"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/payment-methods", label: "Payment" },
  { href: "/account/coupons", label: "Coupons" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/support", label: "Support" },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-6 overflow-x-auto pb-2 mb-8 border-b border-stone-200">
      {LINKS.map(l => {
        const active = pathname === l.href;
        return (
          <Link key={l.href} href={l.href} className={`pb-3 text-[11px] uppercase tracking-widest font-medium whitespace-nowrap border-b-2 -mb-px transition ${active ? "border-black text-black" : "border-transparent text-stone-500 hover:text-black"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}