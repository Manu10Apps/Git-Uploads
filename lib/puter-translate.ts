'use client';

import type { SupportedLanguage } from '@/lib/translation-service';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ky: 'Kinyarwanda',
  en: 'English',
  sw: 'Kiswali',
};

// LibreTranslate language codes (https://libretranslate.de/languages)
const LIBRETRANSLATE_CODES: Record<SupportedLanguage, string | null> = {
  ky: null, // Kinyarwanda not supported - will use fallback
  en: 'en',
  sw: 'sw',
};

interface PuterTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
}

const LIBRETRANSLATE_API = 'https://libretranslate.de/translate';

/**
 * Translate text using LibreTranslate API (free, no API key required)
 */
async function translateTextWithRetry(
  text: string,
  sourceLang: string,
  targetLang: string,
  maxRetries = 2
): Promise<string> {
  if (!text || text.trim() === '') {
    return text;
  }

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[libretranslate] Translation attempt ${attempt + 1}/${maxRetries + 1}: ${sourceLang} → ${targetLang}`
      );

      // Add timeout wrapper
      const fetchPromise = fetch(LIBRETRANSLATE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
        }),
      });

      const timeoutPromise = new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Translation timeout after 15s')), 15000)
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { translatedText?: string };

      if (!data.translatedText) {
        throw new Error('No translation in response');
      }

      console.log('[libretranslate] ✓ Translation successful');
      return data.translatedText;
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[libretranslate] Attempt ${attempt + 1} failed:`, errorMsg);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 1s, 2s)
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error('[libretranslate] Translation failed after all retries:', lastError);
  throw new Error(
    `Translation failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

/**
 * Translate article fields using LibreTranslate (client-side, free, no API key).
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
): Promise<PuterTranslationResult> {
  // If same language, return as-is
  if (fromLang === toLang) {
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery || undefined,
    };
  }

  // Check if target language is supported
  const targetCode = LIBRETRANSLATE_CODES[toLang];
  if (!targetCode) {
    console.warn(
      `[libretranslate] Target language "${toLang}" not supported. Returning original content.`
    );
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery || undefined,
    };
  }

  // LibreTranslate: always translate from English as source
  const sourceCode = 'en';

  const fromName = LANGUAGE_NAMES[fromLang];
  const toName = LANGUAGE_NAMES[toLang];

  console.log(`[libretranslate] Starting article translation (${fromName} → ${toName})`);

  try {
    // Translate fields in parallel
    const [translatedTitle, translatedExcerpt, translatedContent, translatedCaptions] =
      await Promise.all([
        translateTextWithRetry(article.title, sourceCode, targetCode),
        translateTextWithRetry(article.excerpt, sourceCode, targetCode),
        translateTextWithRetry(article.content, sourceCode, targetCode),
        article.gallery && article.gallery.length > 0
          ? Promise.all(
              article.gallery.map(async item => ({
                url: item.url,
                caption: await translateTextWithRetry(item.caption, sourceCode, targetCode),
              }))
            )
          : Promise.resolve(undefined),
      ]);

    const result: PuterTranslationResult = {
      title: translatedTitle || article.title,
      excerpt: translatedExcerpt || article.excerpt,
      content: translatedContent || article.content,
      galleryCaptions: translatedCaptions || article.gallery,
    };

    console.log('[libretranslate] ✓ Article translation complete');
    return result;
  } catch (error) {
    console.error('[libretranslate] Article translation failed:', error);
    throw error;
  }
}
