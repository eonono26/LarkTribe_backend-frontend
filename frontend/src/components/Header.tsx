"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, User, Heart } from "lucide-react";
import { api } from "@/lib/api";
import type { Department } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { isLoggedIn } from "@/lib/auth";
import NotificationBell from "./NotificationBell";

const DEPT_COLOR: Record<string, string> = {
  women: "var(--dept-women)",
  kids: "var(--dept-kids)",
  beauty: "var(--dept-beauty)",
  maternity: "var(--dept-maternity)",
  "home-lifestyle": "var(--dept-home)",
};

export default function Header() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [query, setQuery] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const { itemCount, openDrawer } = useCart();
  const router = useRouter();

  useEffect(() => {
    api.departments().then((r) => setDepartments(r.results)).catch(() => {});
    setLoggedIn(isLoggedIn());
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-paper)] border-b border-[var(--color-line)]">
      <div className="bg-[var(--color-ink)] text-[var(--color-paper)] overflow-hidden">
        <div className="whitespace-nowrap py-1.5 text-[11px] tracking-wide marquee-track">
          <span className="mx-6">FREE DELIVERY ON ORDERS OVER KSh 5,000</span>
          <span className="mx-6">•</span>
          <span className="mx-6">PAY WITH M-PESA AT CHECKOUT</span>
          <span className="mx-6">•</span>
          <span className="mx-6">NEW VENDORS JOINING WEEKLY</span>
          <span className="mx-6">•</span>
          <span className="mx-6">FREE DELIVERY ON ORDERS OVER KSh 5,000</span>
          <span className="mx-6">•</span>
          <span className="mx-6">PAY WITH M-PESA AT CHECKOUT</span>
          <span className="mx-6">•</span>
          <span className="mx-6">NEW VENDORS JOINING WEEKLY</span>
        </div>
      </div>

      <div className="container-shell flex items-center gap-6 py-4">
        <Link href="/" className="font-display text-2xl font-black tracking-tight shrink-0">
          duka<span className="bg-[var(--color-signal)] px-1">.</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 items-center gap-2 bg-[var(--color-mist)] rounded-full px-4 py-2.5">
          <Search size={18} className="text-neutral-500 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dresses, skincare, baby gear…"
            className="bg-transparent w-full outline-none text-sm placeholder:text-neutral-500"
          />
        </form>

        <div className="flex items-center gap-5 ml-auto shrink-0">
          <Link href="/vendor" className="hidden sm:block text-xs font-semibold uppercase tracking-wide hover:underline">
            Sell on duka
          </Link>
          <Link href={loggedIn ? "/account/wishlist" : "/login"} aria-label="Account" className="hover:opacity-70">
            <User size={22} />
          </Link>
          <Link href={loggedIn ? "/account/wishlist" : "/login"} aria-label="Wishlist" className="hover:opacity-70">
            <Heart size={22} />
          </Link>
          <NotificationBell />
          <button aria-label="Cart" onClick={openDrawer} className="relative hover:opacity-70">
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[var(--color-flag)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav className="container-shell flex items-center gap-6 overflow-x-auto pb-3 text-sm font-semibold">
        {departments.map((d) => (
          <Link
            key={d.id}
            href={`/category/${d.slug}`}
            className="whitespace-nowrap pb-1 border-b-2 border-transparent hover:border-current transition-colors"
            style={{ color: DEPT_COLOR[d.slug] ?? "var(--color-ink)" }}
          >
            {d.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
