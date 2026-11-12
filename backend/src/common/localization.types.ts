export const SUPPORTED_LOCALES = ['vi', 'en', 'ja', 'ko'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type LocalizedText = Partial<Record<Locale, string>>;

export interface LocalizedVersions<TContent> {
  draft?: Partial<Record<Locale, TContent>>;
  published?: Partial<Record<Locale, TContent>>;
}
