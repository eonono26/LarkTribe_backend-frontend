"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, User, Heart, MapPin, ChevronDown, Menu } from "lucide-react";
import { api } from "@/lib/api";
import type { Department } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { isLoggedIn } from "@/lib/auth";
import NotificationBell from "./NotificationBell";
import SearchBar from "./SearchBar";
import LanguageSwitcher from "./LanguageSwitcher";
import LocationModal from "./LocationModal";
import Image from "next/image";

const DEPT_COLOR: Record<string, string> = {
  women: "var(--dept-women)",
  kids: "var(--dept-kids)",
  beauty: "var(--dept-beauty)",
  maternity: "var(--dept-maternity)",
  "home-lifestyle": "var(--dept-home)",
};

const DEFAULT_LOCATION = { label: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 };

export default function Header() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { itemCount, openDrawer } = useCart();

  useEffect(() => {
    // Fetch categories directly with a simpler approach
    async function loadCategories() {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/catalog/categories/');
        if (response.ok) {
          const data = await response.json();
          console.log('Categories loaded:', data.results);
          setCategories(data.results || []);
        } else {
          console.error('Failed to fetch categories:', response.status);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }
    
    loadCategories();
    setLoggedIn(isLoggedIn());
    const saved = localStorage.getItem("duka_location");
    if (saved) setLocation(JSON.parse(saved));
  }, []);

  function saveLocation(loc: typeof DEFAULT_LOCATION) {
    setLocation(loc);
    localStorage.setItem("duka_location", JSON.stringify(loc));
  }

  // Create a duplicated array for seamless marquee
  const duplicatedCategories = categories.length > 0 ? [...categories, ...categories] : [];

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-paper)] border-b border-[var(--color-line)]">
     {/* <div className="bg-[var(--color-signal)] text-[var(--color-promo)] text-sm font-medium py-1">
       <div className="container-shell">
        <div className="promo-marquee-wrapper">
          <div className="promo-marquee-track">
            <span>Free delivery on orders over KSh 5,000</span>
            <span>•</span>
            <span>Pay with M-PESA at checkout</span>
            <span>•</span>
            <span>New vendors joining weekly</span>

            <span>•</span>

            <span>Free delivery on orders over KSh 5,000</span>
            <span>•</span>
            <span>Pay with M-PESA at checkout</span>
            <span>•</span>
            <span>New vendors joining weekly</span>
          </div>
        </div>
      </div> 
    </div> */}


      {/* Desktop main row */}
      <div className="container-shell hidden md:flex items-center gap-6 py-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo.png"
            alt="LarkTribe"
            width={520}
            height={240}
            priority
            className="h-16 w-auto object-contain"
          />
        </Link>

        <button
          onClick={() => setLocationOpen(true)}
          className="flex items-center gap-2 text-sm font-medium shrink-0 hover:opacity-70 max-w-[170px] font-body">
        
          <MapPin size={16} className="shrink-0" />
          <span className="text-left leading-tight">
          <span className="block text-xs text-gray-500">
              Deliver to
          </span>

          <span className="block text-sm font-semibold truncate">
              {location.label}
          </span>
         </span>
          <ChevronDown size={14} className="shrink-0" />
        </button>

        <SearchBar className="flex-1" />

        <div className="flex items-center gap-5 ml-auto shrink-0">
          <Link
            href="/deals"
            className="hidden lg:block text-sm font-semibold text-[var(--color-flag)]"
        >
            Deals
        </Link>

        <Link
            href="/brands"
            className="hidden lg:block text-sm font-medium"
        >
            Brands
        </Link>

        <Link
            href="/vendor"
            className="hidden lg:block text-sm font-medium"
        >
            Sell on LarkTribe
        </Link>
          <LanguageSwitcher />
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

      {/* Mobile top row */}
      <div className="container-shell flex md:hidden items-center justify-between gap-3 py-3">
        <button onClick={() => setMobileNavOpen((o) => !o)} aria-label="Menu" className="shrink-0">
          <Menu size={22} />
        </button>
        <Link href="/" className="font-display text-2xl font-bold tracking-tight shrink-0">
          LarkTribe<span className="bg-[var(--color-signal)] px-1">.</span>
        </Link>
        <div className="flex items-center gap-4 ml-auto shrink-0">
          <NotificationBell />
          <button aria-label="Cart" onClick={openDrawer} className="relative">
            <ShoppingBag size={48} />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[var(--color-flag)] text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile location + search */}
      <div className="container-shell flex md:hidden flex-col gap-2 pb-3">
        <button
          onClick={() => setLocationOpen(true)}
          className="flex items-center gap-1 text-xs font-semibold self-start hover:opacity-70"
        >
          <MapPin size={14} className="shrink-0" />
          Deliver to <span className="font-bold">{location.label}</span>
          <ChevronDown size={12} />
        </button>
        <SearchBar />
      </div>

      {/* Mobile dropdown nav */}
      {mobileNavOpen && (
        <div className="md:hidden border-t border-[var(--color-line)] bg-[var(--color-paper)]">
          <nav className="container-shell flex flex-col py-2 text-sm font-semibold">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                onClick={() => setMobileNavOpen(false)}
                className="py-2.5 border-b border-[var(--color-line)] last:border-0"
                style={{ color: DEPT_COLOR[c.department?.slug] ?? "var(--color-ink)" }}
              >
                {c.name}
              </Link>
            ))}
            <Link href="/deals" onClick={() => setMobileNavOpen(false)} className="py-2.5 text-xs uppercase tracking-wide border-b border-[var(--color-line)] text-[var(--color-flag)]">
              Deals
            </Link>
            <Link href="/brands" onClick={() => setMobileNavOpen(false)} className="py-2.5 text-xs uppercase tracking-wide border-b border-[var(--color-line)]">
              Brands
            </Link>
            <Link href="/vendor" onClick={() => setMobileNavOpen(false)} className="py-2.5 text-xs uppercase tracking-wide">
              Sell on duka
            </Link>
            <div className="py-2.5">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}

      {/* Desktop category nav - MARQUEE SCROLLING with padding */}
      {categories.length > 0 && (
        <div className="container-shell hidden md:block pb-3">
  <div className="category-marquee-wrapper">
    <div className="category-marquee-track">
      {duplicatedCategories.map((c, index) => (
        <Link
          key={`${c.id}-${index}`}
          href={`/category/${c.slug}`}
          className="category-marquee-item"
          style={{
            color: DEPT_COLOR[c.department?.slug] ?? "var(--color-ink)",
          }}
        >
          {c.name}
        </Link>
      ))}
    </div>
  </div>
</div>
      )}

      {/* Show loading state */}
      {categories.length === 0 && (
        <div className="container-shell hidden md:block pb-3">
          <div className="text-sm text-gray-400 py-2">Loading categories...</div>
        </div>
      )}

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} onSave={saveLocation} initialLocation={location} />
    </header>
  );
}