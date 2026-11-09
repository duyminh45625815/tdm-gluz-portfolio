import en from "./en";
import vi from "./vi";

export type Locale = "en" | "vi";

export const translations = { en, vi };
export type Translations = typeof en;
