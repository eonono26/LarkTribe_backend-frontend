"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { AUTH_CHANGED_EVENT, isLoggedIn, auth, type AuthUser } from "@/lib/auth";
import { api, mediaUrl } from "@/lib/api";
import type { Wishlist, ProductListItem } from "@/lib/types";
import {
  MegaPanel,
  MobileMenuBody,
  buildTree,
  type MenuData,
} from "@/components/MegaMenu";

const NAV_LINKS = [
  { href: "/shop?stage=baby", label: "Babies", source: { stage: "baby" } },
  { href: "/shop?stage=kids", label: "Kids", source: { stage: "kids" } },
  {
    href: "/shop?department=women",
    label: "Women",
    source: { department: "women" },
  },
  {
    href: "/shop?department=men",
    label: "Men",
    source: { department: "men" },
  },
  { href: "/showroom", label: "3D Store", source: null },
  { href: "/looks", label: "Looks", source: null },
] as const;

const GENDER_QUICK = (stage: string) => [
  { label: "Girls", href: `/shop?stage=${stage}&gender=girls` },
  { label: "Boys", href: `/shop?stage=${stage}&gender=boys` },
  { label: "Unisex", href: `/shop?stage=${stage}&gender=unisex` },
];


export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount, openDrawer } = useCart();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [menus, setMenus] = useState<Record<string, MenuData>>({});
  const [closedMenu, setClosedMenu] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  // Hydration-safe flags: stay false during SSR + first client render.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  // Close menus when the route changes (state adjusted during render, not in an effect)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  // Lock page scroll while the side menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Publish the pinned header's height as a CSS variable (used by sticky bars that sit under it).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let allCats: ReturnType<typeof api.categories> | null = null;

    const loadAll = () => (allCats ??= api.categories({ page_size: "300" }));

    const put = (label: string, data: MenuData) => {
      if (!cancelled) {
        setMenus((prev) => ({ ...prev, [label]: data }));
      }
    };

    NAV_LINKS.forEach((link) => {
      const src = link.source;
      if (!src) return;

      if ("department" in src) {
        api
          .categories({ department: src.department, page_size: "300" })
          .then((r) =>
            put(link.label, {
              nodes: buildTree(
                `department=${src.department}`,
                r.results || []
              ),
              quick: [],
            })
          )
          .catch(() => {});
        return;
      }

      Promise.all([
        loadAll(),
        api.categories({ stage: src.stage, page_size: "300" }),
        api.ageGroupsByStage(src.stage),
      ])
        .then(([all, inStage, ages]) => {
          const nodes = buildTree(
            `stage=${src.stage}`,
            all.results || [],
            new Set((inStage.results || []).map((c) => c.id))
          );

          const ageLinks = (ages.age_groups || [])
            .filter(
              (a) => a.is_active !== false && (a.product_count ?? 0) > 0
            )
            .sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
            .map((a) => ({
              label: a.name,
              href: `/shop?stage=${src.stage}&age_group=${encodeURIComponent(
                a.slug
              )}`,
            }));

          const quick = [
            { title: "Shop for", links: GENDER_QUICK(src.stage) },
          ];

          if (ageLinks.length) {
            quick.push({ title: "Shop by age", links: ageLinks });
          }

          put(link.label, { nodes, quick });
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep the shared header in sync with login/logout, token refreshes,
  // profile edits, and authentication changes made in another browser tab.
  const accountLoadId = useRef(0);

  useEffect(() => {
    let active = true;

    const loadAccountState = async () => {
      const loadId = ++accountLoadId.current;

      if (!isLoggedIn()) {
        setUser(null);
        setWishlistCount(0);
        return;
      }

      try {
        const currentUser = await auth.me();
        if (!active || loadId !== accountLoadId.current) return;
        setUser(currentUser);
      } catch {
        if (!active || loadId !== accountLoadId.current) return;
        setUser(null);
      }

      // Wishlist is independent: a temporary wishlist API failure must not
      // hide a successfully authenticated account from the header.
      try {
        const response = await api.wishlist();
        if (!active || loadId !== accountLoadId.current) return;
        const items = Array.isArray(response)
          ? response
          : (response as { results: Wishlist[] }).results;
        setWishlistCount(items.length);
      } catch {
        if (active && loadId === accountLoadId.current) {
          setWishlistCount(0);
        }
      }
    };

    const handleAuthChange = () => {
      void loadAccountState();
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "duka_access_token" ||
        event.key === "duka_refresh_token"
      ) {
        void loadAccountState();
      }
    };

    const handleWishlistChange = () => {
      if (!isLoggedIn()) { setWishlistCount(0); return; }
      api.wishlist().then((response) => {
        if (!active) return;
        const items = Array.isArray(response) ? response : response.results;
        setWishlistCount(items.length);
      }).catch(() => {});
    };

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pageshow", handleAuthChange);
    window.addEventListener("larktribe:wishlist-changed", handleWishlistChange);
    void loadAccountState();

    return () => {
      active = false;
      accountLoadId.current += 1;
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pageshow", handleAuthChange);
      window.removeEventListener("larktribe:wishlist-changed", handleWishlistChange);
    };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    let cancelled = false;

    if (!q) {
      const handle = setTimeout(() => {
        if (!cancelled) {
          setSuggestions([]);
          setSearching(false);
        }
      }, 0);

      return () => {
        cancelled = true;
        clearTimeout(handle);
      };
    }

    const handle = setTimeout(() => {
      if (cancelled) return;

      setSearching(true);

      api
        .smartSearch(q)
        .then((r) => {
          if (cancelled) return;
          setSuggestions((r.results || []).slice(0, 5));
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  }

  function goToSuggestion(product: ProductListItem) {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(`/product/${product.slug}`);
  }

  const isHome = pathname === "/";
  // Zara: on the home page the header floats transparent over the full-bleed hero,
  // then turns solid white once you scroll or open a menu.
  const overlay = isHome && !scrolled && !mobileOpen && !searchOpen;
  const ink = overlay ? "text-white" : "text-black";
  const navItem = `zara-link ${ink} transition-colors`;

  return (
    <>
      <header
        ref={headerRef}
        className={`${isHome ? "fixed" : "sticky"} top-0 left-0 right-0 z-40 transition-colors duration-300 ${
          overlay ? "bg-gradient-to-b from-black/35 to-transparent" : "bg-white"
        }`}
      >
        <div className="relative flex items-center h-14 lg:h-16 px-4 sm:px-6 lg:px-8">
          {/* Left: menu + desktop categories */}
          <div className="flex items-center gap-5 lg:gap-7 flex-1 min-w-0">
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className={`flex flex-col justify-center gap-[5px] w-6 h-6 ${ink}`}
            >
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
              <span className="block h-px w-5 bg-current" />
            </button>

            <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
              {NAV_LINKS.map((link) => {
                const menu = menus[link.label];
                if (menu && menu.nodes.length > 0) {
                  return (
                    <div key={link.label} className="group py-5 -my-5" onMouseLeave={() => setClosedMenu(null)}>
                      <Link href={link.href} onClick={() => setClosedMenu(link.label)} className={navItem}>
                        {link.label}
                      </Link>
                      <div
                        className={`absolute left-0 top-full w-screen bg-white text-black border-t border-stone-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 ${
                          closedMenu === link.label ? "hidden" : ""
                        }`}
                      >
                        <div className="px-5 sm:px-8 lg:px-12 xl:px-16">
                          <MegaPanel label={link.label} href={link.href} data={menu} onNavigate={() => setClosedMenu(link.label)} />
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <Link key={link.label} href={link.href} className={navItem}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: wordmark */}
          <Link href="/" aria-label="LarkTribe home" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img
              src="/Asset_2_1.svg"
              alt="LarkTribe"
              className={`h-4 lg:h-5 w-auto object-contain transition ${overlay ? "brightness-0 invert" : ""}`}
            />
          </Link>

          {/* Right: Zara text utilities */}
          <div className="flex items-center justify-end gap-4 sm:gap-6 flex-1">
            <button onClick={() => setSearchOpen(true)} aria-label="Search" className={`${navItem} flex items-center gap-1.5`}>
              <Search className="w-4 h-4 lg:hidden" strokeWidth={1.5} />
              <span className="hidden lg:inline">Search</span>
            </button>
            <Link href={user ? "/account" : "/login"} className={`${navItem} hidden sm:inline`}>
              {user ? (user.first_name || "Account") : "Log in"}
            </Link>
            <Link href="/account/wishlist" className={`${navItem} hidden md:inline`}>
              Saved{mounted && wishlistCount > 0 ? ` (${wishlistCount})` : ""}
            </Link>
            <button onClick={openDrawer} aria-label="Shopping bag" className={navItem}>
              Bag{mounted && itemCount > 0 ? ` (${itemCount})` : ""}
            </button>
          </div>
        </div>
      </header>

      {/* Search overlay — full-width, Zara style */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto" ref={searchBoxRef}>
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-4 h-14 lg:h-16 px-4 sm:px-6 lg:px-8 border-b border-stone-200">
            <Search className="w-4 h-4" strokeWidth={1.5} />
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[13px] uppercase tracking-[0.06em] outline-none placeholder:text-stone-400"
              placeholder="Search"
            />
            <button type="button" aria-label="Close search" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </form>
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {searchQuery.trim() ? (
              searching ? (
                <p className="zara-label text-stone-400">Searching…</p>
              ) : suggestions.length === 0 ? (
                <p className="zara-label text-stone-400">No results</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[2px]">
                  {suggestions.map((p) => (
                    <button key={p.id} onClick={() => goToSuggestion(p)} className="text-left group">
                      <div className="aspect-[3/4] bg-stone-100 overflow-hidden">
                        {p.image ? (
                          <img src={mediaUrl(p.image)} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700" />
                        ) : null}
                      </div>
                      <p className="mt-2 px-1 text-[11px] uppercase tracking-[0.04em] line-clamp-1">{p.name}</p>
                      <p className="px-1 text-[11px] text-stone-500">KES {parseFloat(p.price).toLocaleString("en-KE")}</p>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <p className="zara-label text-stone-400">Trending</p>
                {["Linen shirts", "Baby bodysuits", "Activewear", "Shorts"].map((t) => (
                  <button key={t} onClick={() => setSearchQuery(t)} className="block text-[13px] uppercase tracking-[0.06em] hover:underline underline-offset-4">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side menu — all screen sizes, like Zara */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="side-menu absolute inset-y-0 left-0 w-full sm:w-[420px] bg-white text-black flex flex-col">
            <div className="flex items-center justify-between h-14 lg:h-16 px-4 sm:px-6">
              <button aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="w-6 h-6" strokeWidth={1.25} />
              </button>
              <img src="/Asset_2_1.svg" alt="LarkTribe" className="h-4 w-auto" />
              <span className="w-6" />
            </div>

            <nav className="flex-1 overflow-y-auto pb-6">
              {NAV_LINKS.map((link) => {
                const menu = menus[link.label];
                if (menu && menu.nodes.length > 0) {
                  const open = mobileExpanded === link.label;
                  return (
                    <div key={link.label}>
                      <button
                        onClick={() => setMobileExpanded(open ? null : link.label)}
                        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 text-[15px] uppercase tracking-[0.04em]"
                      >
                        <span>{link.label}</span>
                        <ChevronDown className={`w-4 h-4 transition ${open ? "rotate-180" : ""}`} strokeWidth={1.25} />
                      </button>
                      {open && (
                        <MobileMenuBody data={menu} href={link.href} label={link.label} onNavigate={() => setMobileOpen(false)} />
                      )}
                    </div>
                  );
                }
                return (
                  <Link key={link.label} href={link.href} onClick={() => setMobileOpen(false)} className="block px-4 sm:px-6 py-4 text-[15px] uppercase tracking-[0.04em]">
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-stone-200 px-4 sm:px-6 py-5 flex flex-col gap-3">
              <Link href={user ? "/account" : "/login"} onClick={() => setMobileOpen(false)} className="zara-label">
                {user ? `${user.first_name || user.username} — Account` : "Log in"}
              </Link>
              {!user && <Link href="/register" onClick={() => setMobileOpen(false)} className="zara-label">Register</Link>}
              <Link href="/account/wishlist" onClick={() => setMobileOpen(false)} className="zara-label">Saved</Link>
              <Link href="/account/orders" onClick={() => setMobileOpen(false)} className="zara-label">Orders</Link>
              <Link href="/help" onClick={() => setMobileOpen(false)} className="zara-label">Help</Link>
              {user && (
                <button onClick={() => { auth.logout(); setMobileOpen(false); router.push("/"); }} className="zara-label text-left text-stone-500">
                  Log out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
