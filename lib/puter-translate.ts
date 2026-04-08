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
  article: { title: string; excerpt: string; content: string },
  fromLang: SupportedLanguage,
  toLang: SupportedLanguage
): Promise<PuterTranslationResult> {
  if (fromLang === toLang) {
    return { title: article.title, excerpt: article.excerpt, content: article.content };
  }

  const ready = await waitForPuter();
  if (!ready || !window.puter?.ai) {
    throw new Error('puter.ai is not available');
  }

  const fromName = LANGUAGE_NAMES[fromLang];
  const toName = LANGUAGE_NAMES[toLang];

  const prompt = `You are an expert journalist translator specializing in East African languages. Translate the following article fields from ${fromName} to ${toName}.

Rules:
- Preserve journalistic tone and style
- Do NOT translate proper nouns (names, places, organizations)
- Preserve all HTML/markdown formatting in the content field
- Keep numbers, dates, and currencies as-is

Return ONLY a valid JSON object with these exact keys: "title", "excerpt", "content"

Input:
${JSON.stringify({ title: article.title, excerpt: article.excerpt, content: article.content })}`;

  const response = await window.puter.ai.chat(prompt, { model: 'gpt-5.4-nano' });

  // Extract JSON from the response
  const responseText = typeof response === 'string' ? response : String(response);
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse translation response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as PuterTranslationResult;

  if (!parsed.title || !parsed.excerpt || !parsed.content) {
    throw new Error('Incomplete translation response');
  }

  return parsed;
}
