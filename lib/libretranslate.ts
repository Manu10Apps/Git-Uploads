'use client';

import type { SupportedLanguage } from '@/lib/translation-service';

// LibreTranslate language code mappings
const LANG_CODES: Record<SupportedLanguage, string> = {
  ky: 'en', // Kinyarwanda not supported, use English placeholder (won't translate)
  en: 'en',
  sw: 'sw',
};

interface LibreTranslateResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
}

const LIBRE_TRANSLATE_API = 'https://libretranslate.de/translate';

/**
 * Translate text using LibreTranslate API (free, no authentication required).
 * Falls back to original text if translation is unavailable.
 */
async function translateText(
  text: string,
  fromLang: string,
  toLang: string,
  maxRetries = 2
): Promise<string> {
  if (!text || fromLang === toLang) {
    return text;
  }

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(LIBRE_TRANSLATE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: fromLang,
          target: toLang,
          format: 'text',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.translatedText || text;

      console.log(`[libretranslate] ✓ Translated: ${fromLang} → ${toLang} (${text.length} → ${translatedText.length} chars)`);
      return translatedText;
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[libretranslate] Attempt ${attempt + 1} failed:`, errorMsg);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  console.error('[libretranslate] Translation failed, using original text:', lastError);
  return text; // Fallback to original
}

/**
 * Translate article fields using LibreTranslate API.
 */
export async function puterTranslateArticle(
  article: {
    title: string;
    excerpt: string;
    content: string;
    gallery?: Array<{ url: string; caption: string }>;
  },
  fromLang: SupportedLanguage,
  toLang: SupportedLanguage
): Promise<LibreTranslateResult> {
  if (fromLang === toLang || fromLang === 'ky' || toLang === 'ky') {
    // Kinyarwanda (ky) not supported by LibreTranslate
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery || undefined,
    };
  }

  const fromCode = LANG_CODES[fromLang];
  const toCode = LANG_CODES[toLang];

  console.log(`[libretranslate] Starting translation: ${fromLang}(${fromCode}) → ${toLang}(${toCode})`);

  try {
    // Translate main fields in parallel
    const [title, excerpt, content] = await Promise.all([
      translateText(article.title, fromCode, toCode),
      translateText(article.excerpt, fromCode, toCode),
      translateText(article.content, fromCode, toCode),
    ]);

    // Translate gallery captions if present
    let galleryCaptions: Array<{ url: string; caption: string }> | undefined;
    if (article.gallery && article.gallery.length > 0) {
      galleryCaptions = await Promise.all(
        article.gallery.map(async (item) => ({
          url: item.url,
          caption: await translateText(item.caption, fromCode, toCode),
        }))
      );
    }

    console.log('[libretranslate] ✓ Full article translated successfully');

    return {
      title,
      excerpt,
      content,
      galleryCaptions,
    };
  } catch (err) {
    console.error('[libretranslate] Translation failed:', err);
    // Return original article on complete failure
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery,
    };
  }
}
