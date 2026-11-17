"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { t as translate, type TranslationKey } from "./translations";

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

// LarkTribe is Kenya-only: KES and English are the only supported options.
// Kept as arrays (rather than single values) so components that map over
// `currencies`/`languages` keep working, but nothing else ever gets added.
const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate_to_base: 1, is_base: true, is_default: true },
];

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", native_name: "English", flag: "🇰🇪", is_default: true },
];

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
  const [currencies] = useState<CurrencyOption[]>(FALLBACK_CURRENCIES);
  const [languages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);
  const [currencyCode] = useState("KES");
  const [languageCode] = useState("en");
  const [loading, setLoading] = useState(true);

  // LarkTribe is KES + English only — no backend fetch, no per-user
  // preference sync needed. Kept `loading` for API compatibility.
  useEffect(() => {
    setLoading(false);
  }, []);

  const setCurrency = useCallback((_code: string) => {
    // No-op: LarkTribe only supports KES.
  }, []);

  const setLanguage = useCallback((_code: string) => {
    // No-op: LarkTribe only supports English.
  }, []);
  const currency = useMemo(
    () => currencies.find((c) => c.code === currencyCode) ?? currencies.find((c) => c.is_default) ?? currencies[0] ?? FALLBACK_CURRENCIES[0],
    [currencies, currencyCode]
  );

  const language = useMemo(
    () => languages.find((l) => l.code === languageCode) ?? languages.find((l) => l.is_default) ?? languages[0] ?? FALLBACK_LANGUAGES[0],
    [languages, languageCode]
  );

  const formatPrice = useCallback((kesAmount: string | number) => {
    // KES only — no conversion needed.
    const n = typeof kesAmount === "string" ? parseFloat(kesAmount) : kesAmount;
    return `KSh ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }, []);

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
