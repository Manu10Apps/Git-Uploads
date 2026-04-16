'use client';

import type { SupportedLanguage } from '@/lib/translation-service';

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (prompt: string, options?: { model?: string }) => Promise<string>;
      };
    };
  }
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  ky: 'Kinyarwanda',
  en: 'English',
  sw: 'Kiswahili',
};

interface PuterTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
}

/**
 * Wait for puter.js to be available (max 10 seconds).
 */
async function waitForPuter(maxWait = 10000): Promise<boolean> {
  if (window.puter?.ai) return true;
  const start = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if (window.puter?.ai) {
        console.log('[puter-translate] Puter AI ready');
        return resolve(true);
      }
      if (Date.now() - start > maxWait) {
        console.error('[puter-translate] Puter AI failed to load after', maxWait, 'ms');
        return resolve(false);
      }
      setTimeout(check, 100);
    };
    check();
  });
}

/**
 * Translate article fields using puter.ai (client-side, free, no API key).
 * With retry logic for timeouts and resilience.
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
  if (fromLang === toLang) {
    return {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      galleryCaptions: article.gallery || undefined,
    };
  }

  const ready = await waitForPuter();
  if (!ready || !window.puter?.ai) {
    console.error('[puter-translate] Puter.ai not available');
    throw new Error('puter.ai is not available');
  }

  const fromName = LANGUAGE_NAMES[fromLang];
  const toName = LANGUAGE_NAMES[toLang];

  // Build translation request
  const fieldsToTranslate: any = {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
  };

  if (article.gallery && article.gallery.length > 0) {
    fieldsToTranslate.galleryCaptions = article.gallery;
  }

  // Simplified prompt focused on structured output
  const prompt = `Translate this article from ${fromName} to ${toName}.

IMPORTANT RULES:
- Do NOT translate proper nouns (names, places, organizations)
- Preserve all formatting and HTML
- Keep numbers, dates, currencies unchanged
- For gallery captions: only translate the "caption" field, keep "url" unchanged
- Return ONLY valid JSON with keys: "title", "excerpt", "content"${article.gallery && article.gallery.length > 0 ? ', "galleryCaptions"' : ''}

ARTICLE:
${JSON.stringify(fieldsToTranslate, null, 2)}

TRANSLATE AND RETURN ONLY THE JSON:`;

  // Retry logic for transient failures
  let lastError: any;
  const maxRetries = 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[puter-translate] Translation attempt ${attempt + 1}/${maxRetries + 1} (${fromName} → ${toName})`);
      
      // Add timeout wrapper
      const translationPromise = window.puter.ai.chat(prompt, { model: 'gpt-5.4-nano' });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Translation timeout after 30s')), 30000)
      );
      
      const response = await Promise.race([translationPromise, timeoutPromise]);

      // Handle various response formats from puter.ai
      let responseText: string;
      if (typeof response === 'string') {
        responseText = response;
      } else if (response && typeof response === 'object') {
        const r = response as any;
        responseText = r?.message?.content || r?.text || r?.content || JSON.stringify(response);
      } else {
        responseText = String(response);
      }

      console.log('[puter-translate] Raw response length:', responseText.length);

      // Find JSON in response (with or without code blocks)
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : responseText;
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      let parsed: PuterTranslationResult;
      try {
        parsed = JSON.parse(jsonMatch[0]) as PuterTranslationResult;
      } catch (parseErr) {
        console.warn('[puter-translate] JSON parse error:', parseErr);
        throw new Error('Invalid JSON in response');
      }

      if (!parsed.title || !parsed.content) {
        throw new Error(`Missing required fields: title=${!!parsed.title}, content=${!!parsed.content}`);
      }

      // Ensure excerpt has a value
      if (!parsed.excerpt) {
        parsed.excerpt = parsed.title;
      }

      // Process gallery captions if provided
      if (article.gallery && article.gallery.length > 0) {
        if (parsed.galleryCaptions && Array.isArray(parsed.galleryCaptions)) {
          try {
            parsed.galleryCaptions = parsed.galleryCaptions.map((item: any) => ({
              url: item.url || '',
              caption: item.caption || item.text || '',
            }));
          } catch (e) {
            console.warn('[puter-translate] Error mapping gallery captions:', e);
          }
        } else {
          // Use original gallery if translation didn't include captions
          parsed.galleryCaptions = article.gallery;
        }
      }

      console.log('[puter-translate] ✓ Translation successful');
      return parsed;
      
    } catch (err) {
      lastError = err;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[puter-translate] Attempt ${attempt + 1} failed:`, errorMsg);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff: 1s, 2s)
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries exhausted
  console.error('[puter-translate] Translation failed after all retries:', lastError);
  throw new Error(`Translation service unavailable: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}
