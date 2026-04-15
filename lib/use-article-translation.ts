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
          },
          'ky',
          lang
        );

        if (cancelledRef.current) return;

        const translatedArticle: TranslatedArticle = {
          title: result.title,
          excerpt: result.excerpt,
          content: result.content,
          galleryCaptions: originalGallery || undefined,
          translationSource: 'puter-ai',
          translatedAt: new Date().toISOString(),
        };

        translationCache.set(cacheKey, translatedArticle);
        setTranslation(translatedArticle);

        // 3. Save/update translation in database for future visitors
        try {
          await fetch('/api/translations/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              articleId,
              language: lang,
              title: result.title,
              excerpt: result.excerpt,
              content: result.content,
              galleryCaptions: originalGallery || null,
            }),
          });
        } catch {
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
