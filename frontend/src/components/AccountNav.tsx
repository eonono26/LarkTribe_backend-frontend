"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  Heart,
  MapPin,
  Package,
  TicketPercent,
  UserRound,
  MessagesSquare,
} from "lucide-react";

const LINKS = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/payment-methods", label: "Payment", icon: CreditCard },
  { href: "/account/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/support", label: "Support", icon: MessagesSquare },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account sections" className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 min-w-0 items-center gap-2 border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition sm:justify-center sm:px-2 ${
              active
                ? "border-black bg-black text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-400 hover:text-black"
            }`}
          >
            <Icon size={15} strokeWidth={1.7} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}