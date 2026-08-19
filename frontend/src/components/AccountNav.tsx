"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/payment-methods", label: "Payment Methods" },
  { href: "/account/coupons", label: "Coupons" },
  { href: "/account/wishlist", label: "Wishlist" },
  { href: "/account/notifications", label: "Notifications" },
  { href: "/account/support", label: "Help & Support" },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--color-line)] mb-8 -mt-2">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active
                ? "border-[var(--color-ink)] text-[var(--color-ink)]"
                : "border-transparent text-neutral-500 hover:text-[var(--color-ink)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
