'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { SupportedLanguage } from '@/lib/translation-service';
import { puterTranslateArticle } from '@/lib/puter-translate';

interface TranslatedArticle {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
  translationSource: string;
  translatedAt: string;
}

interface UseArticleTranslationOptions {
  articleId: string | number;
  originalTitle: string;
  originalExcerpt: string;
  originalContent: string;
  originalGallery?: Array<{ url: string; caption: string }>;
}

interface UseArticleTranslationResult {
  title: string;
  excerpt: string;
  content: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
  isTranslating: boolean;
  isTranslated: boolean;
  translationError: string | null;
  translationSource: string | null;
}

// Client-side cache to avoid re-fetching on rapid language switches
const translationCache = new Map<string, TranslatedArticle>();

export function useArticleTranslation({
  articleId,
  originalTitle,
  originalExcerpt,
  originalContent,
  originalGallery,
}: UseArticleTranslationOptions): UseArticleTranslationResult {
  const { language } = useAppStore();
  const [translation, setTranslation] = useState<TranslatedArticle | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchTranslation = useCallback(
    async (lang: SupportedLanguage) => {
      if (lang === 'ky' || !articleId) {
        setTranslation(null);
        setTranslationError(null);
        return;
      }

      const cacheKey = `${articleId}:${lang}`;
      const cached = translationCache.get(cacheKey);
      if (cached) {
        setTranslation(cached);
        setTranslationError(null);
        return;
      }

      cancelledRef.current = false;
      setIsTranslating(true);
      setTranslationError(null);

      try {
        // 1. Try fetching from database first (instant if cached)
        const dbRes = await fetch(
          `/api/translations/cache?articleId=${encodeURIComponent(articleId)}&lang=${encodeURIComponent(lang)}`
        );
        const dbData = await dbRes.json();

        if (cancelledRef.current) return;

        if (dbData.data && !dbData.stale) {
          // Fresh DB translation — use it directly
          const translatedArticle: TranslatedArticle = {
            title: dbData.data.title,
            excerpt: dbData.data.excerpt,
            content: dbData.data.content,
            galleryCaptions: dbData.data.galleryCaptions,
            translationSource: dbData.data.translationSource || 'db-cache',
            translatedAt: new Date().toISOString(),
          };
          translationCache.set(cacheKey, translatedArticle);
          setTranslation(translatedArticle);
          return;
        }

        if (dbData.data && dbData.stale) {
          // Stale DB translation — show immediately, then re-translate in background
          const staleArticle: TranslatedArticle = {
            title: dbData.data.title,
            excerpt: dbData.data.excerpt,
            content: dbData.data.content,
            galleryCaptions: dbData.data.galleryCaptions,
            translationSource: dbData.data.translationSource || 'db-cache',
            translatedAt: new Date().toISOString(),
          };
          setTranslation(staleArticle);
          // Don't return — fall through to re-translate and update DB below
        }

        // 2. No DB cache or stale — translate with puter.ai
        const result = await puterTranslateArticle(
          {
            title: originalTitle,
            excerpt: originalExcerpt,
            content: originalContent,
            gallery: originalGallery,
          },
          'ky',
          lang
        );

        if (cancelledRef.current) return;

        const translatedArticle: TranslatedArticle = {
          title: result.title,
          excerpt: result.excerpt,
          content: result.content,
          galleryCaptions: result.galleryCaptions || originalGallery,
          translationSource: 'puter-ai',
          translatedAt: new Date().toISOString(),
        };

        translationCache.set(cacheKey, translatedArticle);
        setTranslation(translatedArticle);

        // 3. Save/update translation in database for future visitors
        try {
          // Validate and sanitize gallery captions
          let sanitizedCaptions = null;
          if (result.galleryCaptions && Array.isArray(result.galleryCaptions)) {
            sanitizedCaptions = result.galleryCaptions.filter(
              (item: any) => item && item.caption && item.url
            );
            if (sanitizedCaptions.length === 0) {
              sanitizedCaptions = null;
            }
          }

          // Check payload size before sending
          const payload = {
            articleId,
            language: lang,
            title: result.title,
            excerpt: result.excerpt,
            content: result.content,
            galleryCaptions: sanitizedCaptions,
          };

          const payloadSize = JSON.stringify(payload).length;
          console.log('[useArticleTranslation] Payload size:', payloadSize, 'bytes');

          if (payloadSize > 10 * 1024 * 1024) {
            console.error('[useArticleTranslation] Payload too large:', payloadSize);
            return; // Skip DB save if too large
          }

          console.log('[useArticleTranslation] STARTING FETCH TO /api/translations/cache');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          console.log('[useArticleTranslation] FETCH CONFIG - Method: POST, Headers: Content-Type: application/json');
          const response = await fetch('/api/translations/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log('[useArticleTranslation] RESPONSE RECEIVED - Status:', response.status, 'OK:', response.ok);
          console.log('[useArticleTranslation] RESPONSE HEADERS:', JSON.stringify(Object.fromEntries(response.headers)));

          if (!response.ok) {
            console.log('[useArticleTranslation] RESPONSE NOT OK - Attempting to read body');
            let errorData;
            let responseText = '';
            try {
              responseText = await response.text();
              console.log('[useArticleTranslation] RAW RESPONSE TEXT:', responseText);
              console.log('[useArticleTranslation] RAW TEXT LENGTH:', responseText.length);
              errorData = responseText ? JSON.parse(responseText) : { error: `HTTP ${response.status}` };
            } catch (parseErr) {
              console.error('[useArticleTranslation] FAILED TO PARSE RESPONSE:', parseErr);
              errorData = { error: `HTTP ${response.status}`, parseError: String(parseErr), rawText: responseText };
            }
            console.error(
              '[useArticleTranslation] Translation save FAILED - Status',
              response.status,
              'Error:',
              JSON.stringify(errorData)
            );
            // Still display the translation locally even if save fails
          } else {
            console.log('[useArticleTranslation] Translation saved successfully');
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.error('[useArticleTranslation] Save request timed out after 15s');
          } else {
            console.error('[useArticleTranslation] Error saving translation:', error);
          }
          // DB save failed — translation still works client-side
        }
      } catch (error: any) {
        if (cancelledRef.current) return;
        setTranslation(null);
        setTranslationError(null);
      } finally {
        if (!cancelledRef.current) {
          setIsTranslating(false);
        }
      }
    },
    [articleId, originalTitle, originalExcerpt, originalContent, originalGallery]
  );

  useEffect(() => {
    fetchTranslation(language as SupportedLanguage);

    return () => {
      cancelledRef.current = true;
    };
  }, [language, fetchTranslation]);

  const isTranslated = translation !== null && language !== 'ky';

  return {
    title: isTranslated ? translation.title : originalTitle,
    excerpt: isTranslated ? translation.excerpt : originalExcerpt,
    content: isTranslated ? translation.content : originalContent,
    galleryCaptions: isTranslated ? translation.galleryCaptions : originalGallery,
    isTranslating,
    isTranslated,
    translationError,
    translationSource: isTranslated ? translation.translationSource : null,
  };
}
