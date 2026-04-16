// Server-side LibreTranslate translation service (no 'use client')
import type { SupportedLanguage } from '@/lib/translation-service';

// LibreTranslate language codes
const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  ky: 'rw', // Kinyarwanda
  en: 'en', // English
  sw: 'sw', // Kiswahili
};

// Fallback language codes if primary doesn't work
const LANGUAGE_FALLBACK: Record<SupportedLanguage, string> = {
  ky: 'en', // Fallback Kinyarwanda to English if 'rw' unsupported
  en: 'en',
  sw: 'sw',
};

interface LibreTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
  translationSource?: string;
}

// Multiple LibreTranslate instances to try as fallbacks
// Includes both public and self-hosted instances for better language support
const LIBRETRANSLATE_ENDPOINTS = [
  'https://translate.terraprint.com/translate', // Most reliable
  'https://api.libretranslate.de/translate',
  'https://libretranslate.de/translate',
  'https://libretranslate.com/translate',
  'https://libretranslate.nyc/translate', // NYC instance
];

/**
 * Split text into chunks respecting the API limit
 * LibreTranslate free tier has ~500 char limit per request
 */
function chunkText(text: string, maxChunkSize: number = 400): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkSize) {
      chunks.push(remaining);
      break;
    }

    // Try to break at a sentence or word boundary
    let chunkEnd = maxChunkSize;
    const lastPeriod = remaining.lastIndexOf('.', maxChunkSize);
    const lastNewline = remaining.lastIndexOf('\n', maxChunkSize);
    const lastSpace = remaining.lastIndexOf(' ', maxChunkSize);

    if (lastPeriod > maxChunkSize * 0.7) {
      chunkEnd = lastPeriod + 1;
    } else if (lastNewline > maxChunkSize * 0.7) {
      chunkEnd = lastNewline + 1;
    } else if (lastSpace > maxChunkSize * 0.7) {
      chunkEnd = lastSpace;
    }

    chunks.push(remaining.substring(0, chunkEnd).trim());
    remaining = remaining.substring(chunkEnd).trim();
  }

  return chunks;
}

/**
 * Translate text using LibreTranslate API (free, no authentication required)
 * Tries multiple public instances for reliability
 * Chunks large text to respect API limits (~500 chars per request)
 */
async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  endpointIndex = 0,
  maxRetries = 2
): Promise<string> {
  if (!text || !text.trim()) {
    return '';
  }

  // Chunk the text for large translations
  const chunks = chunkText(text, 400);
  console.log(`[libretranslate-server] Translating ${chunks.length} chunk(s) (total: ${text.length} chars)`);

  const translatedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[libretranslate-server] Translating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

    const translated = await translateChunk(chunk, sourceLang, targetLang, endpointIndex, maxRetries);
    translatedChunks.push(translated);
  }

  return translatedChunks.join(' ').trim();
}

/**
 * Translate a single chunk of text
 */
async function translateChunk(
  text: string,
  sourceLang: string,
  targetLang: string,
  endpointIndex = 0,
  maxRetries = 3  // Increased from 2
): Promise<string> {
  if (endpointIndex >= LIBRETRANSLATE_ENDPOINTS.length) {
    throw new Error('All LibreTranslate endpoints exhausted');
  }

  const endpoint = LIBRETRANSLATE_ENDPOINTS[endpointIndex];
  let lastError: any;
  let isBadRequest = false;  // Track if it's a 400 error (unsupported language)

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
        console.error(`[libretranslate-server] HTTP ${response.status} from ${endpoint}`);
        console.error(`  Lang: ${sourceLang} -> ${targetLang}, Text: "${text.substring(0, 50)}..."`);
        console.error(`  Response: ${errorText.substring(0, 300)}`);
        
        // 400 = bad request (likely unsupported language), try next endpoint immediately
        if (response.status === 400) {
          isBadRequest = true;
          throw new Error(`Unsupported language pair (${sourceLang}->${targetLang}): ${response.status}`);
        }
        // 429 = rate limited, retry with backoff
        if (response.status === 429) {
          throw new Error(`Rate limited: ${response.status}`);
        }
        throw new Error(`LibreTranslate API error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error(`[libretranslate-server] Invalid content type ${contentType}`);
        console.error(`[libretranslate-server] Response preview: ${responseText.substring(0, 200)}`);
        // If we're getting HTML, the endpoint is likely down or misconfigured
        if (contentType?.includes('text/html')) {
          // Skip to next endpoint for HTML responses
          throw new Error(`Endpoint returned HTML (possibly down): ${contentType}`);
        }
        throw new Error(`Invalid content-type: ${contentType}`);
      }

      const data = await response.json();
      if (!data.translatedText) {
        throw new Error('No translation returned from API');
      }

      console.log(`[libretranslate-server] ✓ Translated ${text.length} chars successfully`);
      return data.translatedText;
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[libretranslate-server] Endpoint attempt ${attempt + 1}/${maxRetries + 1} failed:`, errorMsg);

      // 400 errors (bad request/unsupported lang) should skip to next endpoint immediately
      // Also skip on HTML responses (endpoint likely down)
      if (isBadRequest || errorMsg.includes('HTML') || errorMsg.includes('endpoint returned')) {
        break;  // Exit retry loop, try next endpoint
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[libretranslate-server] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Try next endpoint if available
  if (endpointIndex < LIBRETRANSLATE_ENDPOINTS.length - 1) {
    console.log(`[libretranslate-server] Trying next endpoint (${endpointIndex + 1}/${LIBRETRANSLATE_ENDPOINTS.length})`);
    return translateChunk(text, sourceLang, targetLang, endpointIndex + 1, maxRetries);
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
