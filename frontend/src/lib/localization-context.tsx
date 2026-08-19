"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isLoggedIn, authedFetch } from "./auth";
import { t as translate, type TranslationKey } from "./translations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  rate_to_base: string | number;
  is_base?: boolean;
  is_default?: boolean;
}

export interface LanguageOption {
  code: string;
  name: string;
  native_name: string;
  flag: string;
  is_default?: boolean;
}

// Fallback data so the storefront still works if the backend is briefly
// unreachable — mirrors what `seed_localization` seeds on the backend.
const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate_to_base: 1, is_base: true, is_default: true },
  { code: "USD", name: "US Dollar", symbol: "$", rate_to_base: 0.0067 },
  { code: "EUR", name: "Euro", symbol: "€", rate_to_base: 0.0062 },
  { code: "GBP", name: "British Pound", symbol: "£", rate_to_base: 0.0053 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate_to_base: 11.9 },
  { code: "ZAR", name: "South African Rand", symbol: "R", rate_to_base: 0.125 },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh", rate_to_base: 25.3 },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", rate_to_base: 17.8 },
];

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", native_name: "English", flag: "🇬🇧", is_default: true },
  { code: "sw", name: "Swahili", native_name: "Kiswahili", flag: "🇰🇪" },
  { code: "fr", name: "French", native_name: "Français", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", native_name: "العربية", flag: "🇸🇦" },
];

const CURRENCY_KEY = "duka_currency";
const LANGUAGE_KEY = "duka_language";

interface LocalizationContextValue {
  currencyCode: string;
  languageCode: string;
  currency: CurrencyOption;
  language: LanguageOption;
  currencies: CurrencyOption[];
  languages: LanguageOption[];
  loading: boolean;
  setCurrency: (code: string) => void;
  setLanguage: (code: string) => void;
  /** Converts a price stored in the base currency (KES) into the selected
   * currency and formats it, e.g. formatPrice(5000) -> "$33". */
  formatPrice: (kesAmount: string | number) => string;
  /** UI-chrome translation helper. Falls back to English, then the key itself. */
  t: (key: TranslationKey) => string;
}

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(FALLBACK_CURRENCIES);
  const [languages, setLanguages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);
  const [currencyCode, setCurrencyCode] = useState("KES");
  const [languageCode, setLanguageCode] = useState("en");
  const [loading, setLoading] = useState(true);

  // Load available currencies/languages from the backend (falls back to the
  // hardcoded lists above if the API isn't reachable yet).
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const [curRes, langRes] = await Promise.all([
          fetch(`${API_URL}/localization/currencies/`, { cache: "no-store" }),
          fetch(`${API_URL}/localization/languages/`, { cache: "no-store" }),
        ]);
        if (!cancelled && curRes.ok) {
          const data = await curRes.json();
          if (Array.isArray(data) && data.length) setCurrencies(data);
        }
        if (!cancelled && langRes.ok) {
          const data = await langRes.json();
          if (Array.isArray(data) && data.length) setLanguages(data);
        }
      } catch {
        // backend not reachable yet — keep fallback lists
      }
    }

    loadOptions();
    return () => { cancelled = true; };
  }, []);

  // Decide the initial currency/language: prefer a logged-in user's saved
  // preference (syncs across devices), then localStorage (guest), then default.
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const savedCurrency = typeof window !== "undefined" ? localStorage.getItem(CURRENCY_KEY) : null;
      const savedLanguage = typeof window !== "undefined" ? localStorage.getItem(LANGUAGE_KEY) : null;
      if (savedCurrency) setCurrencyCode(savedCurrency);
      if (savedLanguage) setLanguageCode(savedLanguage);

      if (isLoggedIn()) {
        try {
          const me = await authedFetch("/auth/me/");
          if (!cancelled) {
            if (me?.preferred_currency) {
              setCurrencyCode(me.preferred_currency);
              localStorage.setItem(CURRENCY_KEY, me.preferred_currency);
            }
            if (me?.preferred_language) {
              setLanguageCode(me.preferred_language);
              localStorage.setItem(LANGUAGE_KEY, me.preferred_language);
            }
          }
        } catch {
          // not logged in / token stale — localStorage value already applied
        }
      }
      if (!cancelled) setLoading(false);
    }

    loadInitial();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((patch: { preferred_currency?: string; preferred_language?: string }) => {
    if (!isLoggedIn()) return;
    authedFetch("/auth/me/", { method: "PATCH", body: JSON.stringify(patch) }).catch(() => {});
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyCode(code);
    localStorage.setItem(CURRENCY_KEY, code);
    persist({ preferred_currency: code });
  }, [persist]);

  const setLanguage = useCallback((code: string) => {
    setLanguageCode(code);
    localStorage.setItem(LANGUAGE_KEY, code);
    persist({ preferred_language: code });
  }, [persist]);

  const currency = useMemo(
    () => currencies.find((c) => c.code === currencyCode) ?? currencies.find((c) => c.is_default) ?? currencies[0] ?? FALLBACK_CURRENCIES[0],
    [currencies, currencyCode]
  );

  const language = useMemo(
    () => languages.find((l) => l.code === languageCode) ?? languages.find((l) => l.is_default) ?? languages[0] ?? FALLBACK_LANGUAGES[0],
    [languages, languageCode]
  );

  const formatPrice = useCallback((kesAmount: string | number) => {
    const n = typeof kesAmount === "string" ? parseFloat(kesAmount) : kesAmount;
    const rate = typeof currency.rate_to_base === "string" ? parseFloat(currency.rate_to_base) : currency.rate_to_base;
    const converted = (n || 0) * (rate || 1);
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: 0,
        maximumFractionDigits: converted !== 0 && Math.abs(converted) < 10 ? 2 : 0,
      }).format(converted);
    } catch {
      // Intl doesn't recognise the code (shouldn't happen for our list) — fall back to symbol formatting
      return `${currency.symbol} ${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
  }, [currency]);

  const t = useCallback((key: TranslationKey) => translate(key, languageCode), [languageCode]);

  return (
    <LocalizationContext.Provider
      value={{ currencyCode, languageCode, currency, language, currencies, languages, loading, setCurrency, setLanguage, formatPrice, t }}
    >
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationContextValue {
  const ctx = useContext(LocalizationContext);
  if (!ctx) throw new Error("useLocalization must be used within a LocalizationProvider");
  return ctx;
}
