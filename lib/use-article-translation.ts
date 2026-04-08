'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { SupportedLanguage } from '@/lib/translation-service';

interface TranslatedArticle {
  title: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
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
  const abortRef = useRef<AbortController | null>(null);

  const fetchTranslation = useCallback(
    async (lang: SupportedLanguage) => {
      if (lang === 'ky') {
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

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const response = await fetch(
          `/api/translations/article/${articleId}?lang=${lang}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Translation request failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.data && !result.isOriginal) {
          translationCache.set(cacheKey, result.data);
          setTranslation(result.data);
        } else {
          setTranslation(null);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        // Silently fall back to original content
        setTranslation(null);
        setTranslationError(null);
      } finally {
        setIsTranslating(false);
      }
    },
    [articleId]
  );

  useEffect(() => {
    fetchTranslation(language as SupportedLanguage);

    return () => {
      abortRef.current?.abort();
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
