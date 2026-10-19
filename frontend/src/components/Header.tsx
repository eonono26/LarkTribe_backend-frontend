
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Menu,
  Search,
  X,
  Heart,
  ShoppingBag,
  ChevronDown,
  User2,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { isLoggedIn, auth, type AuthUser } from "@/lib/auth";
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
] as const;

const GENDER_QUICK = (stage: string) => [
  { label: "Girls", href: `/shop?stage=${stage}&gender=girls` },
  { label: "Boys", href: `/shop?stage=${stage}&gender=boys` },
  { label: "Unisex", href: `/shop?stage=${stage}&gender=unisex` },
];

export default function Header() {
  const router = useRouter();
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
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("announcementDismissed") !== "1"
    ) {
      setShowAnnouncement(true);
    }
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

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) return;

    auth.me().then(setUser).catch(() => {});

    api
      .wishlist()
      .then((r) => {
        const items = Array.isArray(r)
          ? r
          : (r as { results: Wishlist[] }).results;

        setWishlistCount(items.length);
      })
      .catch(() => {});
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

  function dismissAnnouncement() {
    setShowAnnouncement(false);

    if (typeof window !== "undefined") {
      localStorage.setItem("announcementDismissed", "1");
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-transparent transition-all duration-300 ${
          scrolled ? "border-stone-200" : ""
        }`}
      >
        {/* Announcement Bar */}
        {showAnnouncement && (
          <div className="relative bg-black text-white text-center py-2 px-10">
            <p className="text-[11px] sm:text-xs tracking-[0.08em] uppercase">
              Free delivery on orders over KES 5,000 &nbsp;·&nbsp; Get 5% off
              your first order when you{" "}
              <Link
                href="/register"
                className="underline underline-offset-2 hover:text-stone-300 transition"
              >
                sign up
              </Link>
            </p>

            <button
              aria-label="Dismiss announcement"
              onClick={dismissAnnouncement}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        )}

        <div className="container-shellheader">
          <div className="relative flex items-center h-16 lg:h-20">
            {/* Mobile hamburger */}
            <button
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 lg:hidden"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>

            {/* Desktop navigation */}
            <nav className="hidden lg:flex items-center gap-8 flex-1">
              {NAV_LINKS.map((link) => {
                const menu = menus[link.label];

                if (menu && menu.nodes.length > 0) {
                  return (
                    <div
                      key={link.label}
                      className="group py-6 -my-6"
                      onMouseLeave={() => setClosedMenu(null)}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setClosedMenu(link.label)}
                        className="flex items-center gap-1 text-[11px] tracking-[0.12em] uppercase font-medium text-stone-600 hover:text-black transition border-b border-transparent group-hover:border-black pb-0.5"
                      >
                        {link.label}

                        <ChevronDown
                          className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:rotate-180 transition"
                          strokeWidth={1.5}
                        />
                      </Link>

                      {/* Full-width hover background; padded inner content */}
                      <div
                        className={`absolute left-1/2 top-full w-screen -translate-x-1/2 bg-white border-t border-stone-100 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 ${
                          closedMenu === link.label ? "hidden" : ""
                        }`}
                      >
                        <div className="px-5 sm:px-8 lg:px-12 xl:px-16">
                          <MegaPanel
                            label={link.label}
                            href={link.href}
                            data={menu}
                            onNavigate={() => setClosedMenu(link.label)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[11px] tracking-[0.12em] uppercase font-medium text-stone-600 hover:text-black transition border-b border-transparent hover:border-black pb-0.5"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Centered logo */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 lg:left-1/2 lg:-translate-x-1/2">
              <Link
                href="/"
                className="flex flex-col items-start lg:items-center"
              >
                <span  className="font-editorial text-italised [-webkit-text-stroke-width:3.5px] [-webkit-text-stroke-color:green] text-2xl lg:text-4xl tracking-[0.18em]">
                  Larktribe
                </span>
                <span className="text-[10px] lg:text-[11px] tracking-[0.12em] text-stone-600">
                  Curated Kids & Baby Fashion
                </span>
              </Link>
            </div>

            {/* Right utilities */}
            <div className="ml-auto flex items-center gap-1 sm:gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden lg:block text-[11px] tracking-[0.12em] uppercase font-medium text-stone-600 hover:text-black transition px-2 py-2"
              >
                Search
              </button>

              <button
                onClick={() => setSearchOpen(true)}
                className="lg:hidden p-2"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>

              {/* Account dropdown */}
              <div className="hidden sm:block group/account relative py-6 -my-6">
                {user ? (
                  <button className="flex items-center gap-2 hover:text-black transition">
                    {user.profile_picture_url ? (
                      <img
                        src={user.profile_picture_url}
                        alt=""
                        className="w-7 h-7 object-cover"
                      />
                    ) : (
                      <span className="w-7 h-7 text-white flex items-center justify-center">
                        <User2
                          className="w-3.5 h-3.5 text-black [-webkit-text-stroke-width:1.5px] [-webkit-text-stroke-color:white]"
                          strokeWidth={1.5}
                        />
                      </span>
                    )}
                  </button>
                ) : (
                  <button className="flex items-center gap-2 hover:text-black transition">
                    <span className="hidden xl:inline text-[11px] tracking-[0.12em] uppercase">
                      Account
                    </span>
                    <span className="w-7 h-7 bg-black text-white flex items-center justify-center">
                      <User2
                        className="w-3.5 h-3.5"
                        strokeWidth={1.5}
                      />
                    </span>
                  </button>
                )}

                <div className="absolute top-full right-0 pt-2 opacity-0 invisible group-hover/account:opacity-100 group-hover/account:visible transition-all duration-150 z-40">
                  <div className="w-48 bg-white border border-stone-200 shadow-lg text-[13px]">
                    {user ? (
                      <>
                        <div className="px-4 py-3 border-b border-stone-100">
                          <p className="text-[11px] text-stone-400">
                            Signed in as
                          </p>
                          <p className="font-medium truncate">
                            {user.first_name || user.username}
                          </p>
                        </div>

                        <Link
                          href="/account"
                          className="block px-4 py-2.5 hover:bg-stone-50 transition"
                        >
                          Profile
                        </Link>
                        <Link
                          href="/account/orders"
                          className="block px-4 py-2.5 hover:bg-stone-50 transition"
                        >
                          Orders
                        </Link>
                        <Link
                          href="/account/wishlist"
                          className="block px-4 py-2.5 hover:bg-stone-50 transition"
                        >
                          Wishlist
                        </Link>

                        {(user.role === "admin" || user.is_staff) && (
                          <Link
                            href="/admin"
                            className="block px-4 py-2.5 hover:bg-stone-50 transition font-medium"
                          >
                            Admin dashboard
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            auth.logout();
                            router.push("/");
                          }}
                          className="block w-full text-left px-4 py-2.5 text-stone-400 hover:text-black hover:bg-stone-50 transition border-t border-stone-100"
                        >
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          className="block px-4 py-2.5 hover:bg-stone-50 transition"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/register"
                          className="block px-4 py-2.5 hover:bg-stone-50 transition"
                        >
                          Register
                        </Link>
                        <Link
                          href="/orders"
                          className="block px-4 py-2.5 hover:bg-stone-50 transition border-t border-stone-100"
                        >
                          Track Order
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Wishlist — original indicator retained */}
              <Link
                href="/account/wishlist"
                className="p-2 relative hover:text-black transition"
              >
                <Heart className="w-5 h-5" strokeWidth={1.4} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full" />
                )}
              </Link>

              {/* Cart — original indicator retained */}
              <button
                onClick={openDrawer}
                className="p-2 relative hover:text-black transition"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.4} />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            ref={searchBoxRef}
            className="absolute left-1/2 -translate-x-1/2 top-16 lg:top-20 w-full max-w-2xl bg-white border-b border-stone-200 shadow-xl"
          >
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-3 h-14 px-5 border-b border-stone-100"
            >
              <Search
                className="w-4 h-4 text-stone-400"
                strokeWidth={1.5}
              />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                placeholder="Search products, categories..."
              />
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <X className="w-4 h-4 text-stone-400 hover:text-black" />
              </button>
            </form>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {searchQuery.trim() ? (
                searching ? (
                  <p className="text-xs text-stone-400 py-4">Searching…</p>
                ) : suggestions.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4">No results.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => goToSuggestion(p)}
                        className="text-left group"
                      >
                        <div className="aspect-[3/4] bg-stone-50 overflow-hidden mb-2">
                          {p.image ? (
                            <img
                              src={mediaUrl(p.image)}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-stone-100" />
                          )}
                        </div>
                        <p className="text-[12px] text-stone-800 line-clamp-2">
                          {p.name}
                        </p>
                        <p className="text-[12px] text-stone-500 mt-0.5">
                          KES {parseFloat(p.price).toLocaleString("en-KE")}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-xl text-stone-400">Type to search…</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-sm bg-white flex flex-col">
            <div className="flex items-center justify-between p-1 pl-5 border-stone-200">
              <span className="font-editorial text-italised [-webkit-text-stroke-width:2.5px] [-webkit-text-stroke-color:green] text-xl pl-20 tracking-[0.15em]">
                Larktribe
              </span>
              <button onClick={() => setMobileOpen(false)}>
                <X className="w-8 h-8" strokeWidth={2.5} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {NAV_LINKS.map((link) => {
                const menu = menus[link.label];

                if (menu && menu.nodes.length > 0) {
                  const open = mobileExpanded === link.label;

                  return (
                    <div key={link.label}>
                      <button
                        onClick={() =>
                          setMobileExpanded(open ? null : link.label)
                        }
                        className="w-full flex items-center justify-between px-5 py-3.5 text-sm uppercase tracking-wide border-b border-stone-50"
                      >
                        <span>{link.label}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {open && (
                        <MobileMenuBody
                          data={menu}
                          href={link.href}
                          label={link.label}
                          onNavigate={() => setMobileOpen(false)}
                        />
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block px-5 py-3.5 text-sm uppercase tracking-wide border-b border-stone-50"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-stone-200 p-5 space-y-3 text-sm">
              {user ? (
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="block font-medium"
                >
                  {user.first_name || user.username} — Account
                </Link>
              ) : (
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="font-medium"
                  >
                    Sign In
                  </Link>
                  <span className="text-stone-300">/</span>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="font-medium"
                  >
                    Register
                  </Link>
                </div>
              )}

              <Link
                href="/account/wishlist"
                onClick={() => setMobileOpen(false)}
                className="block text-stone-500"
              >
                Wishlist
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}