"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { translations, type Locale, type Translations } from "@/locales";

type LanguageContextValue = {
  locale: Locale;
  translations: Translations;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setCurrentLocale] = useState(initialLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    document.cookie = `locale=${nextLocale}; Max-Age=31536000; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    document.documentElement.lang = nextLocale;
    const metadata =
      window.location.pathname === "/about"
        ? translations[nextLocale].aboutPage.metadata
        : translations[nextLocale].metadata;
    document.title = metadata.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", metadata.description);
    setCurrentLocale(nextLocale);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      translations: translations[locale],
      setLocale,
    }),
    [locale, setLocale],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}
