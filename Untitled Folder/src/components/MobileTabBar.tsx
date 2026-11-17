"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid2x2, ShoppingBag, Heart, User } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: Grid2x2 },
  { href: "/cart", label: "Bag", icon: ShoppingBag },
  { href: "/account/wishlist", label: "Saved", icon: Heart },
  { href: "/account", label: "Account", icon: User },
] as const;

export default function MobileTabBar() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  if (pathname.startsWith("/admin") || pathname.startsWith("/vendor") || pathname.startsWith("/driver")) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5">
        {TABS.map(tab => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-wider transition ${active ? "text-black font-medium" : "text-stone-400"}`}>
              <span className="relative">
                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
                {tab.href === "/cart" && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-2 h-2 bg-black rounded-full" />
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}