"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AUTH_CHANGED_EVENT, isLoggedIn } from "@/lib/auth";
import type { Wishlist } from "@/lib/types";

interface WishlistContextValue {
  isSaved: (productId: number | string) => boolean;
  toggle: (productId: number | string) => Promise<void>;
  refresh: () => Promise<void>;
}
const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Record<number, number>>({});

  const refresh = useCallback(async () => {
    if (!isLoggedIn()) { setItems({}); return; }
    try {
      const response = await api.wishlist();
      const saved: Wishlist[] = Array.isArray(response) ? response : response.results;
      const next: Record<number, number> = {};
      saved.forEach((item) => {
        const productId = Number(item.product?.id);
        if (productId) next[productId] = item.id;
      });
      setItems(next);
    } catch {
      // Keep the last known wishlist during temporary API failures.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onAuthChange = () => { void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "duka_access_token" || event.key === "duka_refresh_token") void refresh();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const toggle = useCallback(async (productId: number | string) => {
    const id = Number(productId);
    const existing = items[id];
    if (existing != null) {
      await api.removeFromWishlist(existing);
      setItems((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } else {
      const saved = await api.addToWishlist(id);
      setItems((current) => ({ ...current, [id]: saved.id }));
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("larktribe:wishlist-changed"));
  }, [items]);

  const value = useMemo(() => ({
    isSaved: (productId: number | string) => items[Number(productId)] != null,
    toggle,
    refresh,
  }), [items, toggle, refresh]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
