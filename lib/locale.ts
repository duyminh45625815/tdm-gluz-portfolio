import { cookies, headers } from "next/headers";
import { locales, type Locale } from "@/locales";

export function isLocale(value: string | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export function detectLocale(countryCode?: string | null): Locale {
  const country = countryCode?.trim().toUpperCase();

  if (!country) {
    return "vi";
  }

  switch (country) {
    case "VN":
      return "vi";
    case "JP":
      return "ja";
    case "KR":
      return "ko";
    default:
      return "en";
  }
}

export async function getRequestLocale(): Promise<Locale> {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const savedLocale = cookieStore.get("locale")?.value;
  const countryHeader = requestHeaders.get("x-vercel-ip-country");
  const detectedLocale = detectLocale(countryHeader);
  const locale = isLocale(savedLocale) ? savedLocale : detectedLocale;

  if (process.env.NODE_ENV === "development") {
    console.info("[locale-detection]", {
      countryHeader,
      savedLocale: savedLocale ?? null,
      detectedLocale,
      finalLocalePassedToProvider: locale,
    });
  }

  return locale;
}
