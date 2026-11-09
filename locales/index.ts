import en from "./en.json";
import ja from "./ja.json";
import ko from "./ko.json";
import vi from "./vi.json";

export const locales = ["ko", "ja", "vi", "en"] as const;

export type Locale = (typeof locales)[number];
export type Translations = typeof en;

export const translations = {
  ko,
  ja,
  vi,
  en,
} satisfies Record<Locale, Translations>;
