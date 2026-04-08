import { createHash } from 'crypto';
import OpenAI from 'openai';

export type SupportedLanguage = 'ky' | 'en' | 'sw';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ky', 'en', 'sw'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ky';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ky: 'Kinyarwanda',
  en: 'English',
  sw: 'Kiswahili',
};

export const LANGUAGE_LOCALES: Record<SupportedLanguage, string> = {
  ky: 'rw',
  en: 'en',
  sw: 'sw',
};

interface TranslationResult {
  title: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface TranslateTextResult {
  text: string;
}

/**
 * Generate a version hash for content to detect when originals have changed.
 */
export function generateContentHash(title: string, content: string): string {
  return createHash('sha256').update(`${title}||${content}`).digest('hex').slice(0, 16);
}

/**
 * Get the OpenAI client. Uses OPENAI_API_KEY env var.
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return new OpenAI({ apiKey });
}

/**
 * Map internal language codes to full language names for AI prompts.
 */
function getLanguageFullName(lang: SupportedLanguage): string {
  return LANGUAGE_NAMES[lang];
}

/**
 * Translate a single text string from one language to another.
 */
export async function translateText(
  text: string,
  fromLang: SupportedLanguage,
  toLang: SupportedLanguage
): Promise<TranslateTextResult> {
  if (fromLang === toLang) return { text };
  if (!text.trim()) return { text: '' };

  const openai = getOpenAIClient();
  const fromName = getLanguageFullName(fromLang);
  const toName = getLanguageFullName(toLang);

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini',
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `You are an expert translator specializing in East African languages, particularly Kinyarwanda, English, and Kiswahili. Translate text accurately while preserving:
- The original meaning and tone
- Proper nouns (names, places, organizations)
- Numbers, dates, and measurements
- HTML formatting/markdown if present
- Cultural context appropriate for the target language

Respond ONLY with the translation. Do not add explanations, notes, or prefixes.`,
      },
      {
        role: 'user',
        content: `Translate the following text from ${fromName} to ${toName}:\n\n${text}`,
      },
    ],
  });

  return { text: response.choices[0]?.message?.content?.trim() || text };
}

/**
 * Translate a full article (title, excerpt, content, SEO fields) from one language to another.
 * Uses a single API call with structured output for efficiency.
 */
export async function translateArticle(
  article: {
    title: string;
    excerpt: string;
    content: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
  },
  fromLang: SupportedLanguage,
  toLang: SupportedLanguage
): Promise<TranslationResult> {
  if (fromLang === toLang) {
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      seoTitle: article.seoTitle || undefined,
      seoDescription: article.seoDescription || undefined,
    };
  }

  const openai = getOpenAIClient();
  const fromName = getLanguageFullName(fromLang);
  const toName = getLanguageFullName(toLang);

  const fieldsToTranslate: Record<string, string> = {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
  };
  if (article.seoTitle) fieldsToTranslate.seoTitle = article.seoTitle;
  if (article.seoDescription) fieldsToTranslate.seoDescription = article.seoDescription;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini',
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert journalist translator specializing in ${fromName} and ${toName} for a news platform. Translate all provided fields accurately while preserving:
- Journalistic tone and style
- Proper nouns (names, places, organizations) — do NOT translate these
- HTML/markdown formatting in content
- Numbers, dates, currencies
- Cultural context appropriate for the target audience

Return a JSON object with the same keys, each containing the translated text.
Keys: ${Object.keys(fieldsToTranslate).join(', ')}`,
      },
      {
        role: 'user',
        content: `Translate the following article fields from ${fromName} to ${toName}:\n\n${JSON.stringify(fieldsToTranslate, null, 2)}`,
      },
    ],
  });

  const rawContent = response.choices[0]?.message?.content || '{}';

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    // Fallback: translate fields individually
    const [titleResult, excerptResult, contentResult] = await Promise.all([
      translateText(article.title, fromLang, toLang),
      translateText(article.excerpt, fromLang, toLang),
      translateText(article.content, fromLang, toLang),
    ]);

    return {
      title: titleResult.text,
      excerpt: excerptResult.text,
      content: contentResult.text,
      seoTitle: article.seoTitle
        ? (await translateText(article.seoTitle, fromLang, toLang)).text
        : undefined,
      seoDescription: article.seoDescription
        ? (await translateText(article.seoDescription, fromLang, toLang)).text
        : undefined,
    };
  }

  return {
    title: parsed.title || article.title,
    excerpt: parsed.excerpt || article.excerpt,
    content: parsed.content || article.content,
    seoTitle: parsed.seoTitle || undefined,
    seoDescription: parsed.seoDescription || undefined,
  };
}

/**
 * Translate a category name.
 */
export async function translateCategory(
  name: string,
  description: string | null,
  fromLang: SupportedLanguage,
  toLang: SupportedLanguage
): Promise<{ name: string; description: string | null }> {
  if (fromLang === toLang) return { name, description };

  const nameResult = await translateText(name, fromLang, toLang);
  const descResult = description
    ? await translateText(description, fromLang, toLang)
    : { text: null };

  return { name: nameResult.text, description: descResult.text };
}

/**
 * Check if a language code is supported.
 */
export function isValidLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Map URL locale codes to internal language codes.
 * URL: /rw/ → internal: ky, /en/ → en, /sw/ → sw
 */
export function urlLocaleToLanguage(locale: string): SupportedLanguage {
  if (locale === 'rw') return 'ky';
  if (locale === 'en') return 'en';
  if (locale === 'sw') return 'sw';
  return DEFAULT_LANGUAGE;
}

/**
 * Map internal language codes to URL locale codes.
 */
export function languageToUrlLocale(lang: SupportedLanguage): string {
  return LANGUAGE_LOCALES[lang];
}
