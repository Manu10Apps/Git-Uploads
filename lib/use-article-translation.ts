'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { SupportedLanguage } from '@/lib/translation-service';
import { puterTranslateArticle } from '@/lib/puter-translate';

interface TranslatedArticle {
  title: string;
  excerpt: string;
  content: string;
  translationSource: string;
  translatedAt: string;
}

interface UseArticleTranslationOptions {
  articleId: string | number;
  originalTitle: string;
  originalExcerpt: string;
  originalContent: string;
}

interface UseArticleTranslationResult {
  title: string;
  excerpt: string;
  content: string;
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
          translationSource: 'puter-ai',
          translatedAt: new Date().toISOString(),
        };

        translationCache.set(cacheKey, translatedArticle);
        setTranslation(translatedArticle);
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
    [articleId, originalTitle, originalExcerpt, originalContent]
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
    isTranslating,
    isTranslated,
    translationError,
    translationSource: isTranslated ? translation.translationSource : null,
  };
}
