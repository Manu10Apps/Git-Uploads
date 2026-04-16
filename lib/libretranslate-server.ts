// Server-side LibreTranslate translation service (no 'use client')
import type { SupportedLanguage } from '@/lib/translation-service';

// LibreTranslate language codes
const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  ky: 'rw', // Kinyarwanda
  en: 'en', // English
  sw: 'sw', // Kiswahili
};

interface LibreTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
  translationSource?: string;
}

// Multiple LibreTranslate instances to try as fallbacks
const LIBRETRANSLATE_ENDPOINTS = [
  'https://libretranslate.de/translate',
  'https://api.libretranslate.de/translate',
  'https://libretranslate.com/translate',
];

/**
 * Translate text using LibreTranslate API (free, no authentication required)
 * Tries multiple public instances for reliability
 */
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  endpointIndex = 0,
  maxRetries = 2
): Promise<string> {
  if (endpointIndex >= LIBRETRANSLATE_ENDPOINTS.length) {
    throw new Error('All LibreTranslate endpoints exhausted');
  }

  const endpoint = LIBRETRANSLATE_ENDPOINTS[endpointIndex];
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      console.log(`[libretranslate-server] Attempting translation with endpoint: ${endpoint} (attempt ${attempt + 1})`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[libretranslate-server] HTTP ${response.status}:`, errorText.substring(0, 200));
        throw new Error(`LibreTranslate API error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error(`[libretranslate-server] Invalid content type ${contentType}. Response:`, responseText.substring(0, 200));
        throw new Error(`Invalid content-type: ${contentType}. Expected JSON but got HTML or error page`);
      }

      const data = await response.json();
      if (!data.translatedText) {
        throw new Error('No translation returned from API');
      }

      return data.translatedText;
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[libretranslate-server] Endpoint ${endpoint} attempt ${attempt + 1} failed:`, errorMsg);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Try next endpoint if available
  if (endpointIndex < LIBRETRANSLATE_ENDPOINTS.length - 1) {
    console.log(`[libretranslate-server] Trying next endpoint: ${LIBRETRANSLATE_ENDPOINTS[endpointIndex + 1]}`);
    return translateText(text, sourceLang, targetLang, endpointIndex + 1, maxRetries);
  }

  throw new Error(`Translation failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

/**
 * Translate article fields using LibreTranslate API.
 */
export async function translateArticle(
  article: {
    title: string;
    excerpt: string;
    content: string;
    gallery?: Array<{ url: string; caption: string }>;
  },
  fromLang: SupportedLanguage,
  toLang: SupportedLanguage
): Promise<LibreTranslationResult> {
  if (fromLang === toLang) {
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery || undefined,
    };
  }

  const sourceLang = LANGUAGE_MAP[fromLang];
  const targetLang = LANGUAGE_MAP[toLang];

  console.log(`[libretranslate-server] Starting translation: ${fromLang} (${sourceLang}) → ${toLang} (${targetLang})`);

  try {
    // Translate main fields in parallel for speed
    const [title, excerpt, content, galleryCaptions] = await Promise.all([
      translateText(article.title, sourceLang, targetLang),
      translateText(article.excerpt, sourceLang, targetLang),
      translateText(article.content, sourceLang, targetLang),
      article.gallery && article.gallery.length > 0
        ? Promise.all(
            article.gallery.map(async (item) => ({
              url: item.url,
              caption: await translateText(item.caption, sourceLang, targetLang),
            }))
          )
        : Promise.resolve(undefined),
    ]);

    const result: LibreTranslationResult = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      galleryCaptions,
      translationSource: 'libretranslate',
    };

    console.log('[libretranslate-server] ✓ Translation successful');
    return result;
  } catch (err) {
    console.error('[libretranslate-server] Translation failed:', err);
    throw err;
  }
}
