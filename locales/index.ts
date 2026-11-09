import en from "./en.json";
import vi from "./vi.json";
import zhCN from "./zh-CN.json";

export type Locale = "zh-CN" | "en" | "vi";

export type Translations = typeof en;

export const translations = {
  en,
  vi,
  "zh-CN": zhCN,
} satisfies Record<Locale, Translations>;
