// Server-side translation using Groq API (free tier, no API key required for testing)
// Or use Puter's HTTP API if available
import type { SupportedLanguage } from '@/lib/translation-service';

interface GroqTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
}

/**
 * Split text into chunks respecting API limits
 */
function chunkText(text: string, maxChunkSize: number = 2000): string[] {
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
 * Translate text using local/free AI service (Puter via HTTP or similar)
 * Falls back gracefully if service is unavailable
 */
async function translateTextWithAI(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string> {
  if (!text || !text.trim()) {
    return '';
  }

  const chunks = chunkText(text, 2000);
  console.log(`[puter-server-translate] Translating ${chunks.length} chunk(s) (total: ${text.length} chars)`);

  const translatedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[puter-server-translate] Translating chunk ${i + 1}/${chunks.length}`);

    const prompt = `Translate the following text from ${fromLang} to ${toLang}. Return ONLY the translated text, nothing else.

Text to translate:
${chunk}`;

    try {
      // Try using a free local/remote AI service
      // For now, using a simple approach - could be expanded to use Groq, Ollama, or other free services
      const translated = await translateWithPuterOrFallback(prompt, fromLang, toLang);
      translatedChunks.push(translated);
    } catch (err) {
      console.error(`[puter-server-translate] Chunk ${i + 1} failed:`, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  return translatedChunks.join(' ').trim();
}

/**
 * Try Puter API first, then fallback to other services
 */
async function translateWithPuterOrFallback(
  prompt: string,
  fromLang: string,
  toLang: string,
  maxRetries = 3
): Promise<string> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Try Puter.ai HTTP API endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('https://api.puter.com/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate text from ${fromLang} to ${toLang}. Return ONLY the translated text.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          model: 'gpt-3.5-turbo',
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const translated = data.choices?.[0]?.message?.content;
        if (translated) {
          console.log('[puter-server-translate] ✓ Translation successful');
          return translated.trim();
        }
      } else {
        // Handle rate limiting
        if (response.status === 429) {
          const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
          console.warn(`[puter-server-translate] Rate limited (429). Waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[puter-server-translate] Attempt ${attempt + 1} failed:`, errorMsg);

      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`[puter-server-translate] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Fallback: Use a basic translation approach or another service
  // For production, consider: Groq API, Ollama local, or other free services
  const finalError = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Puter translation failed after ${maxRetries + 1} attempts: ${finalError}`);
}

/**
 * Translate article fields using Puter or free AI service
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
): Promise<GroqTranslationResult> {
  const langMap: Record<SupportedLanguage, string> = {
    ky: 'Kinyarwanda',
    en: 'English',
    sw: 'Kiswahili',
  };

  if (fromLang === toLang) {
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery || undefined,
    };
  }

  const fromName = langMap[fromLang];
  const toName = langMap[toLang];

  console.log(`[puter-server-translate] Starting translation: ${fromLang} → ${toLang}`);

  try {
    const [title, excerpt, content, galleryCaptions] = await Promise.all([
      translateTextWithAI(article.title, fromName, toName),
      translateTextWithAI(article.excerpt, fromName, toName),
      translateTextWithAI(article.content, fromName, toName),
      article.gallery && article.gallery.length > 0
        ? Promise.all(
            article.gallery.map(async (item) => ({
              url: item.url,
              caption: await translateTextWithAI(item.caption, fromName, toName),
            }))
          )
        : Promise.resolve(undefined),
    ]);

    const result: GroqTranslationResult = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      galleryCaptions,
    };

    console.log('[puter-server-translate] ✓ Translation successful');
    return result;
  } catch (err) {
    console.error('[puter-server-translate] Translation failed:', err);
    throw err;
  }
}
