// Simple free translation fallback using Google Translate API
import type { SupportedLanguage } from '@/lib/translation-service';

const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  ky: 'rw', // Kinyarwanda
  en: 'en', // English
  sw: 'sw', // Kiswahili
};

interface SimpleTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
}

/**
 * Translate using MyMemory Translation API (free, no key required)
 * More stable fallback than LibreTranslate
 */
async function translateTextMyMemory(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  try {
    const encoded = encodeURIComponent(text);
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${sourceLang}|${targetLang}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.responseData?.translatedText) {
      throw new Error('No translation from MyMemory');
    }

    return data.responseData.translatedText;
  } catch (err) {
    console.error('[mymemory-translate] Failed:', err instanceof Error ? err.message : String(err));
    throw err;
  }
}

/**
 * Translate article fields using MyMemory Translation API.
 * Most stable free translation fallback.
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
): Promise<SimpleTranslationResult> {
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

  console.log(`[mymemory-translate] Starting translation: ${fromLang} (${sourceLang}) → ${toLang} (${targetLang})`);

  try {
    // Translate main fields in parallel
    const [title, excerpt, content, galleryCaptions] = await Promise.all([
      translateTextMyMemory(article.title, sourceLang, targetLang),
      translateTextMyMemory(article.excerpt, sourceLang, targetLang),
      translateTextMyMemory(article.content, sourceLang, targetLang),
      article.gallery && article.gallery.length > 0
        ? Promise.all(
            article.gallery.map(async (item) => ({
              url: item.url,
              caption: await translateTextMyMemory(item.caption, sourceLang, targetLang),
            }))
          )
        : Promise.resolve(undefined),
    ]);

    const result: SimpleTranslationResult = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      galleryCaptions,
    };

    console.log('[mymemory-translate] ✓ Translation successful');
    return result;
  } catch (err) {
    console.error('[mymemory-translate] Translation failed:', err);
    throw err;
  }
}
