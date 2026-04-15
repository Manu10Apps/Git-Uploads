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
      if (window.puter?.ai) return resolve(true);
      if (Date.now() - start > maxWait) return resolve(false);
      requestAnimationFrame(check);
    };
    check();
  });
}

/**
 * Translate article fields using puter.ai (client-side, free, no API key).
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
    throw new Error('puter.ai is not available');
  }

  const fromName = LANGUAGE_NAMES[fromLang];
  const toName = LANGUAGE_NAMES[toLang];

  const fieldsToTranslate: any = {
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
  };

  // Include gallery captions if available
  if (article.gallery && article.gallery.length > 0) {
    fieldsToTranslate.galleryCaptions = article.gallery;
  }

  const prompt = `You are an expert journalist translator specializing in East African languages. Translate the following article fields from ${fromName} to ${toName}.

Rules:
- Preserve journalistic tone and style
- Do NOT translate proper nouns (names, places, organizations)
- Preserve all HTML/markdown formatting in the content field
- Keep numbers, dates, and currencies as-is
- For galleryCaptions (if present): preserve the url field unchanged, translate only the caption field

Return ONLY a valid JSON object with these exact keys: "title", "excerpt", "content"${article.gallery && article.gallery.length > 0 ? ', "galleryCaptions"' : ''}

Input:
${JSON.stringify(fieldsToTranslate)}`;

  const response = await window.puter.ai.chat(prompt, { model: 'gpt-5.4-nano' });

  // Handle various response formats from puter.ai
  let responseText: string;
  if (typeof response === 'string') {
    responseText = response;
  } else if (response && typeof response === 'object') {
    // puter.ai v2 may return { message: { content: "..." } } or { text: "..." }
    const r = response as any;
    responseText = r?.message?.content || r?.text || r?.content || JSON.stringify(response);
  } else {
    responseText = String(response);
  }
  
  // Try to find JSON in a code block first, then bare JSON
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : responseText;
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // Silent error - don't log to console
    throw new Error('Translation service temporarily unavailable');
  }

  let parsed: PuterTranslationResult;
  try {
    parsed = JSON.parse(jsonMatch[0]) as PuterTranslationResult;
  } catch (parseErr) {
    console.warn('[puter-translate] JSON parse error:', parseErr);
    throw new Error('Translation service temporarily unavailable');
  }

  if (!parsed.title || !parsed.content) {
    console.warn('[puter-translate] Missing required fields:', { title: !!parsed.title, content: !!parsed.content });
    throw new Error('Translation service temporarily unavailable');
  }

  // Ensure excerpt has a value
  if (!parsed.excerpt) {
    parsed.excerpt = parsed.title;
  }

  // Include gallery captions if provided
  if (article.gallery && article.gallery.length > 0) {
    if (parsed.galleryCaptions && Array.isArray(parsed.galleryCaptions)) {
      try {
        parsed.galleryCaptions = parsed.galleryCaptions.map((item: any) => ({
          url: item.url || '',
          caption: item.caption || item.text || '',
        }));
      } catch (e) {
        console.warn('[puter-translate] Error mapping gallery captions:', e);
        // Keep original gallery if parsing fails
        parsed.galleryCaptions = article.gallery;
      }
    } else {
      // If gallery captions not translated, use original
      parsed.galleryCaptions = article.gallery;
    }
  }

  return parsed;
}
