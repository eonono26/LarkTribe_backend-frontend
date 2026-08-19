"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { 
  ShoppingBag, 
  User, 
  Heart, 
  MapPin, 
  ChevronDown, 
  Menu, 
  Search,
  X,
  DollarSign,
  Sparkles,
  Tag,
  Truck,
  Shield,
  Clock,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { isLoggedIn, auth, type AuthUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLocalization } from "@/lib/localization-context";
import NotificationBell from "./NotificationBell";
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

const TRENDING_SEARCHES = [
  "Baby Dresses",
  "Women's Tops",
  "Kids Shoes",
  "Maternity Wear",
  "Baby Onesies",
  "Women's Dresses",
  "Accessories",
  "Beauty Products"
];

export default function Header() {
  const [categories, setCategories] = useState<any[]>([]);
  const [ageGroups, setAgeGroups] = useState<any[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { itemCount, openDrawer } = useCart();
  const { currency: selectedCurrency, language: selectedLanguage, currencies: CURRENCIES, languages: LANGUAGES, setCurrency, setLanguage, formatPrice, t } = useLocalization();
  const currencyRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Save recent searches
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recent_searches");
  };

  // Close mobile nav on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setMobileNavOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await api.categories();
        setCategories(data.results || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }

    async function loadAgeGroups() {
      try {
        const data = await api.ageGroups();
        setAgeGroups(Array.isArray(data) ? data : (data as any).results || []);
      } catch (error) {
        console.error('Error fetching age groups:', error);
      }
    }
    
    loadCategories();
    loadAgeGroups();
    const loggedInStatus = isLoggedIn();
    setLoggedIn(loggedInStatus);
    
    // Load user data if logged in
    if (loggedInStatus) {
      auth.me()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // If we can't get user data, user might not be authenticated
          setLoggedIn(false);
        });
    }
    
    const saved = localStorage.getItem("duka_location");
    if (saved) setLocation(JSON.parse(saved));
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthChange = () => {
      const loggedInStatus = isLoggedIn();
      setLoggedIn(loggedInStatus);
      if (loggedInStatus) {
        auth.me()
          .then((userData) => setUser(userData))
          .catch(() => setLoggedIn(false));
      } else {
        setUser(null);
      }
    };

    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  function saveLocation(loc: typeof DEFAULT_LOCATION) {
    setLocation(loc);
    localStorage.setItem("duka_location", JSON.stringify(loc));
  }

  function handleCurrencyChange(currency: typeof CURRENCIES[0]) {
    setCurrency(currency.code);
    setCurrencyOpen(false);
  }

  function handleLanguageChange(language: typeof LANGUAGES[0]) {
    setLanguage(language.code);
    setLanguageOpen(false);
  }

  const duplicatedCategories = categories.length > 0 ? [...categories, ...categories, ...categories] : [];

  // Helper to get user initials
  const getUserInitials = () => {
    if (!user) return "?";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) return user.first_name[0].toUpperCase();
    return user.username?.[0]?.toUpperCase() || "?";
  };

  // Helper to get user display name
  const getUserDisplayName = () => {
    if (!user) return "Account";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) return user.first_name;
    return user.username;
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      {/* Promo Bar - Modern Soft Gradient */}
      <div className="bg-gradient-to-r from-[#f8e8e8] via-[#f5e6d3] to-[#e8d5d5] text-[#4a3728] text-xs md:text-sm font-medium py-1.5 md:py-2.5 overflow-hidden">
        <div className="container-shell">
          <div className="promo-marquee-wrapper">
            <div className="promo-marquee-track flex items-center gap-4 md:gap-8">
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#d4a5a5] flex-shrink-0"></span>
                <span className="truncate">{t("freeDelivery")}</span>
              </span>
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#c4a882] flex-shrink-0"></span>
                <span className="truncate">{t("payWithMpesa")}</span>
              </span>
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#b8a0a0] flex-shrink-0"></span>
                <span className="truncate">{t("newVendors")}</span>
              </span>
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#d4a5a5] flex-shrink-0"></span>
                <span className="truncate">{t("exclusiveDeals")}</span>
              </span>
              {/* Duplicate for seamless scroll */}
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#c4a882] flex-shrink-0"></span>
                <span className="truncate">{t("freeDelivery")}</span>
              </span>
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#b8a0a0] flex-shrink-0"></span>
                <span className="truncate">{t("payWithMpesa")}</span>
              </span>
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#d4a5a5] flex-shrink-0"></span>
                <span className="truncate">{t("newVendors")}</span>
              </span>
              <span className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap">
                <span className="inline-block w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-[#c4a882] flex-shrink-0"></span>
                <span className="truncate">{t("exclusiveDeals")}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="container-shell py-2">
          {/* Top row with logo and actions */}
          <div className="flex items-center justify-between gap-2">
            <button 
              onClick={() => setMobileNavOpen((o) => !o)} 
              aria-label="Menu" 
              className="p-1.5 rounded-lg hover:bg-[#f8e8e8] transition-colors shrink-0"
            >
              <Menu size={22} className="text-gray-700" />
            </button>
            
            <Link href="/" className="flex items-center shrink-0">
              <span className="text-xl font-bold text-[#c96e6e]">
                LarkTribe
              </span>
            </Link>
            
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <NotificationBell />
              <button 
                aria-label="Cart" 
                onClick={openDrawer} 
                className="p-1.5 rounded-lg hover:bg-[#f8e8e8] transition-colors relative"
              >
                <ShoppingBag size={20} className="text-gray-700" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#c96e6e] text-white text-[9px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center shadow-lg">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Location and Search row */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setLocationOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 px-2 py-1 rounded-lg hover:bg-[#f8e8e8] transition-colors"
              >
                <MapPin size={14} className="shrink-0 text-[#c96e6e]" />
                <span className="text-gray-600">{t("deliverTo")}</span>
                <span className="font-semibold text-gray-800 max-w-[80px] truncate">{location.label}</span>
                <ChevronDown size={12} className="text-gray-400" />
              </button>
              
              <div className="flex items-center gap-1">
                {/* Language selector */}
                <button
                  onClick={() => setLanguageOpen(!languageOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#f8e8e8] transition-colors text-xs"
                >
                  <span className="text-sm leading-none">{selectedLanguage.flag}</span>
                  <ChevronDown size={10} className="text-gray-400" />
                </button>

                {/* Currency selector */}
                <button
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[#f8e8e8] transition-colors text-xs font-medium"
                >
                  <span>{selectedCurrency.symbol}</span>
                  <ChevronDown size={10} className="text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Search Bar with suggestions */}
            <div className="relative" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("searchPlaceholderShort")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className="w-full py-2 pl-9 pr-3 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c96e6e] focus:border-transparent text-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </form>

              {/* Search Suggestions */}
              {searchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={12} />
                          {t("recentSearches")}
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {t("clearAll")}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchQuery(item);
                              saveRecentSearch(item);
                              window.location.href = `/search?q=${encodeURIComponent(item)}`;
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f8e8e8] transition-colors flex items-center gap-3 text-sm"
                          >
                            <Clock size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp size={12} className="text-[#c96e6e]" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("trendingNow")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(item);
                            saveRecentSearch(item);
                            window.location.href = `/search?q=${encodeURIComponent(item)}`;
                          }}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#f8e8e8] hover:bg-[#c96e6e] hover:text-white transition-all duration-200 text-gray-700 border border-[#e8d5d5] hover:border-[#c96e6e]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View All */}
                  <div className="p-3 border-t border-gray-100 bg-[#f8e8e8]/30">
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) {
                          saveRecentSearch(searchQuery.trim());
                          window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                        }
                      }}
                      className="w-full text-center text-sm font-medium text-[#c96e6e] hover:text-[#a85555] transition-colors flex items-center justify-center gap-1"
                    >
                      <span>{t("viewAllResults")}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Language Dropdown */}
        {languageOpen && (
          <div className="absolute left-4 right-4 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-60 overflow-y-auto">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => {
                  handleLanguageChange(language);
                  setLanguageOpen(false);
                }}
                className={`
                  w-full px-4 py-2.5 text-left hover:bg-[#f8e8e8] transition-colors flex items-center justify-between
                  ${selectedLanguage.code === language.code ? 'bg-[#f8e8e8] text-[#c96e6e]' : 'text-gray-700'}
                `}
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg">{language.flag}</span>
                  <span className="font-medium text-sm">{language.native_name}</span>
                </span>
                <span className="text-xs text-gray-500">{language.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mobile Currency Dropdown */}
        {currencyOpen && (
          <div className="absolute right-4 left-4 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 max-h-60 overflow-y-auto">
            {CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  handleCurrencyChange(currency);
                  setCurrencyOpen(false);
                }}
                className={`
                  w-full px-4 py-2.5 text-left hover:bg-[#f8e8e8] transition-colors flex items-center justify-between
                  ${selectedCurrency.code === currency.code ? 'bg-[#f8e8e8] text-[#c96e6e]' : 'text-gray-700'}
                `}
              >
                <span className="flex items-center gap-3">
                  <span className="font-semibold">{currency.symbol}</span>
                  <span className="text-sm">{currency.code}</span>
                </span>
                <span className="text-xs text-gray-500">{currency.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Slide-in Navigation - Left to Right */}
      <div 
        ref={mobileNavRef}
        className={`
          fixed top-0 left-0 h-full w-[300px] max-w-[80vw] bg-white shadow-2xl z-[100] 
          transform transition-transform duration-300 ease-in-out
          ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
          md:hidden
        `}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-lg font-bold text-[#c96e6e]">LarkTribe</span>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-2 rounded-lg hover:bg-[#f8e8e8] transition-colors"
          >
            <X size={22} className="text-gray-600" />
          </button>
        </div>

        <nav className="overflow-y-auto h-[calc(100%-64px)] p-4">
          {/* User Profile Section in Mobile Nav */}
          <div className="pb-4 border-b border-gray-100 mb-2">
            {loggedIn && user ? (
              <Link 
                href="/account/profile" 
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#f8e8e8] hover:bg-[#f0e0e0] transition-colors group"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#c96e6e] flex-shrink-0">
                  {user.profile_picture_url ? (
                    <Image
                      src={user.profile_picture_url}
                      alt={getUserDisplayName()}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                      {getUserInitials()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 rotate-[-90deg]" />
              </Link>
            ) : (
              <Link 
                href="/login" 
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#f8e8e8] hover:bg-[#f0e0e0] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User size={22} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Sign In</p>
                  <p className="text-xs text-gray-500">Access your account</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 rotate-[-90deg] ml-auto" />
              </Link>
            )}
          </div>

          {ageGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 py-2 border-b border-gray-100 mb-2">
              {ageGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/shop/age/${g.slug}`}
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold px-3 py-1.5 hover:bg-[#f8e8e8] rounded-lg"
                >
                  <span>{g.icon}</span>
                  <span>{g.name}</span>
                </Link>
              ))}
            </div>
          )}
          
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-[#f8e8e8] px-3 rounded-lg transition-colors"
            >
              <span style={{ color: DEPT_COLOR[c.department?.slug] ?? "var(--color-ink)" }}>
                {c.name}
              </span>
              <ChevronDown size={14} className="rotate-[-90deg] text-gray-400" />
            </Link>
          ))}
          
          <Link 
            href="/deals" 
            onClick={() => setMobileNavOpen(false)} 
            className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-[#f8e8e8] px-3 rounded-lg transition-colors"
          >
            <span className="text-[#c96e6e] font-bold">{t("deals")} 🔥</span>
            <ChevronDown size={14} className="rotate-[-90deg] text-gray-400" />
          </Link>
          
          <Link 
            href="/brands" 
            onClick={() => setMobileNavOpen(false)} 
            className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-[#f8e8e8] px-3 rounded-lg transition-colors"
          >
            <span className="text-gray-600">{t("brands")}</span>
            <ChevronDown size={14} className="rotate-[-90deg] text-gray-400" />
          </Link>

           <Link 
                href="/categories" 
                onClick={() => setMobileNavOpen(false)} 
                className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-[#f8e8e8] px-3 rounded-lg transition-colors"
              >
                <span className="text-gray-600">Categories</span>
                <ChevronDown size={14} className="rotate-[-90deg] text-gray-400" />
              </Link>
          
          <Link 
            href="/vendor" 
            onClick={() => setMobileNavOpen(false)} 
            className="flex items-center justify-between py-3 hover:bg-[#f8e8e8] px-3 rounded-lg transition-colors"
          >
            <span className="text-gray-600">{t("sellOnLarkTribe")}</span>
            <ChevronDown size={14} className="rotate-[-90deg] text-gray-400" />
          </Link>

          {/* Download App CTA inside mobile nav */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <Link
              href="/download"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#c96e6e] to-[#a85555] text-white px-4 py-3 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-300"
            >
              <svg 
                viewBox="0 0 512 512" 
                className="w-5 h-5 fill-current"
              >
                <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
              </svg>
              <span>Download the App Now</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileNavOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[99] md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Desktop Header */}
      <div className="hidden md:block">
        <div className="container-shell py-4">
          {/* Desktop main row */}
          <div className="flex items-center gap-6">
            {/* Logo - Text */}
            <Link href="/" className="flex items-center shrink-0">
              <span className="text-2xl font-bold text-[#c96e6e] hover:opacity-80 transition-opacity">
                LarkTribe
              </span>
            </Link>

            {/* Location */}
            <button
              onClick={() => setLocationOpen(true)}
              className="flex items-center gap-2 text-sm font-medium shrink-0 hover:opacity-70 max-w-[170px] font-body px-3 py-2 rounded-lg hover:bg-[#f8e8e8] transition-colors group"
            >
              <MapPin size={18} className="shrink-0 text-[#c96e6e] group-hover:scale-110 transition-transform" />
              <span className="text-left leading-tight">
                <span className="block text-xs text-gray-500 font-normal">
                  {t("deliverTo")}
                </span>
                <span className="block text-sm font-semibold truncate text-gray-800">
                  {location.label}
                </span>
              </span>
              <ChevronDown size={14} className="shrink-0 text-gray-400" />
            </button>

            {/* Search Bar with suggestions */}
            <div className="flex-1 relative" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <div className={`
                  relative flex items-center rounded-full transition-all duration-300
                  ${searchFocused 
                    ? 'ring-2 ring-[#c96e6e] shadow-lg shadow-[#c96e6e]/15' 
                    : 'hover:shadow-md'
                  }
                `}>
                  <Search 
                    size={20} 
                    className={`absolute left-4 transition-colors duration-300 ${
                      searchFocused ? 'text-[#c96e6e]' : 'text-gray-400'
                    }`} 
                  />
                  <input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className={`
                      w-full py-3 pl-12 pr-4 rounded-full border-2 transition-all duration-300
                      ${searchFocused 
                        ? 'border-[#c96e6e] bg-white' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }
                      focus:outline-none text-sm placeholder-gray-400
                    `}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="absolute right-2 bg-[#c96e6e] hover:bg-[#a85555] text-white px-6 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Search Suggestions - Desktop */}
              {searchFocused && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock size={14} />
                          {t("recentSearches")}
                        </span>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {t("clearAll")}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchQuery(item);
                              saveRecentSearch(item);
                              window.location.href = `/search?q=${encodeURIComponent(item)}`;
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#f8e8e8] transition-colors flex items-center gap-3 text-sm"
                          >
                            <Clock size={16} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-700">{item}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 mb-3">
                      <TrendingUp size={14} className="text-[#c96e6e]" />
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("trendingNow")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(item);
                            saveRecentSearch(item);
                            window.location.href = `/search?q=${encodeURIComponent(item)}`;
                          }}
                          className="px-4 py-2 rounded-full text-sm font-medium bg-[#f8e8e8] hover:bg-[#c96e6e] hover:text-white transition-all duration-200 text-gray-700 border border-[#e8d5d5] hover:border-[#c96e6e]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* View All */}
                  <div className="p-4 border-t border-gray-100 bg-[#f8e8e8]/30">
                    <button
                      onClick={() => {
                        if (searchQuery.trim()) {
                          saveRecentSearch(searchQuery.trim());
                          window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                        }
                      }}
                      className="w-full text-center text-sm font-medium text-[#c96e6e] hover:text-[#a85555] transition-colors flex items-center justify-center gap-2"
                    >
                      <span>{t("seeAllResults")}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3 ml-auto shrink-0">
              {/* Language Selector */}
              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => setLanguageOpen(!languageOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-[#f8e8e8] transition-colors text-sm font-medium"
                >
                  <span className="text-lg leading-none">{selectedLanguage.flag}</span>
                  <span className="hidden xl:inline">{selectedLanguage.code.toUpperCase()}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${languageOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {languageOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => handleLanguageChange(language)}
                        className={`
                          w-full px-4 py-2.5 text-left hover:bg-[#f8e8e8] transition-colors flex items-center justify-between
                          ${selectedLanguage.code === language.code ? 'bg-[#f8e8e8] text-[#c96e6e]' : 'text-gray-700'}
                        `}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-xl">{language.flag}</span>
                          <span className="font-medium">{language.native_name}</span>
                        </span>
                        <span className="text-sm text-gray-500">{language.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Currency Selector */}
              <div className="relative" ref={currencyRef}>
                <button
                  onClick={() => setCurrencyOpen(!currencyOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-[#f8e8e8] transition-colors text-sm font-medium"
                >
                  <DollarSign size={18} className="text-gray-600" />
                  <span>{selectedCurrency.symbol}</span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${currencyOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {currencyOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden z-50 max-h-80 overflow-y-auto">
                    {CURRENCIES.map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => handleCurrencyChange(currency)}
                        className={`
                          w-full px-4 py-2.5 text-left hover:bg-[#f8e8e8] transition-colors flex items-center justify-between
                          ${selectedCurrency.code === currency.code ? 'bg-[#f8e8e8] text-[#c96e6e]' : 'text-gray-700'}
                        `}
                      >
                        <span className="flex items-center gap-3">
                          <span className="font-semibold">{currency.symbol}</span>
                          <span>{currency.code}</span>
                        </span>
                        <span className="text-sm text-gray-500">{currency.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href="/deals"
                className="hidden xl:block text-sm font-semibold text-[#c96e6e] hover:text-[#a85555] transition-colors"
              >
                {t("deals")} 🔥
              </Link>

              <Link
                href="/brands"
                className="hidden xl:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Brands
              </Link>

                <Link
                href="/categories"
                className="hidden xl:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Categories
              </Link>

              <Link
                href="/vendor"
                className="hidden xl:block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sell
              </Link>
              
              {/* Account Button with Profile Picture */}
              <Link 
                href={loggedIn ? "/account" : "/login"} 
                aria-label="Account" 
                className="relative group"
              >
                {loggedIn && user?.profile_picture_url ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent group-hover:border-[#c96e6e] transition-all duration-200">
                    <Image
                      src={user.profile_picture_url}
                      alt={getUserDisplayName()}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="p-2 rounded-full hover:bg-[#f8e8e8] transition-colors">
                    <User size={22} className="text-gray-700 group-hover:text-[#c96e6e] transition-colors" />
                  </div>
                )}
              </Link>
              
              <Link 
                href={loggedIn ? "/account/wishlist" : "/login"} 
                aria-label="Wishlist" 
                className="p-2 rounded-full hover:bg-[#f8e8e8] transition-colors relative group"
              >
                <Heart size={22} className="text-gray-700 group-hover:text-[#c96e6e] transition-colors" />
              </Link>
              
              <NotificationBell />
              
              <button 
                aria-label="Cart" 
                onClick={openDrawer} 
                className="p-2 rounded-full hover:bg-[#f8e8e8] transition-colors relative group"
              >
                <ShoppingBag size={22} className="text-gray-700 group-hover:text-[#c96e6e] transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#c96e6e] text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Shop by age - with Download App CTA on the far right */}
          {/* {ageGroups.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
                {ageGroups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/shop/age/${g.slug}`}
                    className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold border border-[var(--color-line)] rounded px-3 py-1.5 hover:bg-[#f8e8e8] hover:border-[#e8d5d5] transition-colors"
                  >
                    <span>{g.icon}</span>
                    <span>{g.name}</span>
                  </Link>
                ))}
              </div>
              
              //Download App CTA - Animated 
              <div className="shrink-0 ml-4 animate-pulse">
                <Link
                  href="/download"
                  className="group flex items-center gap-2 bg-gradient-to-r from-[#c96e6e] to-[#a85555] text-white px-4 py-1.5 rounded text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <svg 
                    viewBox="0 0 512 512" 
                    className="w-4 h-4 fill-current animate-bounce"
                  >
                    <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
                  </svg>
                  <span>Download the App Now</span>
                  <svg 
                    viewBox="0 0 512 512" 
                    className="w-4 h-4 fill-current group-hover:translate-x-1 transition-transform duration-200"
                  >
                    <path d="M337.9 256L159.6 77.7c-7.8-7.8-20.5-7.8-28.3 0s-7.8 20.5 0 28.3l178.1 178.1-178.1 178.1c-7.8 7.8-7.8 20.5 0 28.3s20.5 7.8 28.3 0L337.9 256z"/>
                  </svg>
                </Link>
              </div>
            </div>
          )} */}

          {/* Desktop category nav - Auto-scrolling marquee */}
          {categories.length > 0 && (
            <div className="mt-3 overflow-hidden">
              <div className="category-marquee-wrapper">
                <div className="category-marquee-track flex items-center gap-8 animate-marquee">
                  {duplicatedCategories.map((c, index) => (
                    <Link
                      key={`${c.id}-${index}`}
                      href={`/category/${c.slug}`}
                      className="category-marquee-item text-sm font-medium whitespace-nowrap hover:opacity-70 transition-opacity px-2 py-1"
                      style={{
                        color: DEPT_COLOR[c.department?.slug] ?? "#333333",
                      }}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {categories.length === 0 && (
            <div className="mt-3">
              <div className="text-sm text-gray-400 py-2 px-2">Loading categories...</div>
            </div>
          )}
        </div>
      </div>

      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} onSave={saveLocation} initialLocation={location} />
    </header>
  );
}