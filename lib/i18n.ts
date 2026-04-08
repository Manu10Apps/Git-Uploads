import kyLocale from '@/locales/ky.json';
import enLocale from '@/locales/en.json';
import swLocale from '@/locales/sw.json';
import type { SupportedLanguage } from '@/lib/translation-service';

export type LocaleMessages = typeof kyLocale;

const locales: Record<SupportedLanguage, LocaleMessages> = {
  ky: kyLocale,
  en: enLocale,
  sw: swLocale,
};

/**
 * Get the full locale dictionary for a language.
 */
export function getLocale(lang: SupportedLanguage): LocaleMessages {
  return locales[lang] || locales.ky;
}

/**
 * Resolve a nested key like "nav.home" from a locale dictionary.
 */
export function t(lang: SupportedLanguage, key: string): string {
  const messages = getLocale(lang);
  const parts = key.split('.');
  let current: any = messages;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key; // fallback to key if not found
    }
  }
  return typeof current === 'string' ? current : key;
}
