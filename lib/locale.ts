import { cookies, headers } from "next/headers";
import type { Locale } from "@/locales";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "vi";
}

function isValidCountryCode(value: string): boolean {
  if (!/^[A-Z]{2}$/.test(value)) {
    return false;
  }

  const countryName = new Intl.DisplayNames(["en"], {
    type: "region",
  }).of(value);

  return Boolean(countryName && countryName !== value && countryName !== "Unknown Region");
}

export function localeFromCountry(country: string | null): Locale {
  const normalizedCountry = country?.trim().toUpperCase();

  if (!normalizedCountry || !isValidCountryCode(normalizedCountry)) {
    return "vi";
  }

  return normalizedCountry === "VN" ? "vi" : "en";
}

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const savedLocale = cookieStore.get("locale")?.value;

  if (isLocale(savedLocale)) {
    return savedLocale;
  }

  return localeFromCountry(requestHeaders.get("x-vercel-ip-country"));
}
