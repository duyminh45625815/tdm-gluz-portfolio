import type { Locale } from './localization.types.js';

export interface PublicLocaleSelection {
  locale: Locale;
  fallbackLocale: Locale;
}

export interface SelectedLocalizedContent<T> {
  locale: Locale;
  content: T;
}

function hasContent(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.some(hasContent);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(hasContent);
  }

  return value !== undefined && value !== null;
}

export function selectPublishedContent<T>(
  versions: Partial<Record<Locale, T>> | undefined,
  selection: PublicLocaleSelection,
): SelectedLocalizedContent<T> | undefined {
  const requested = versions?.[selection.locale];
  if (requested !== undefined && hasContent(requested)) {
    return { locale: selection.locale, content: requested };
  }

  if (selection.fallbackLocale !== selection.locale) {
    const fallback = versions?.[selection.fallbackLocale];
    if (fallback !== undefined && hasContent(fallback)) {
      return { locale: selection.fallbackLocale, content: fallback };
    }
  }

  return undefined;
}
