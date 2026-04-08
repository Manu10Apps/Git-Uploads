'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { Languages, Loader2, AlertTriangle } from 'lucide-react';

interface TranslationBannerProps {
  isTranslating: boolean;
  isTranslated: boolean;
  translationError: string | null;
  translationSource: string | null;
}

export function TranslationBanner({
  isTranslating,
  isTranslated,
  translationError,
  translationSource,
}: TranslationBannerProps) {
  const { language, setLanguage } = useAppStore();
  const t = getTranslation(language);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem('adminAuth'));
  }, []);

  // Hide all translation banners from non-admin users
  if (!isAdmin) return null;

  if (isTranslating) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        <span>{t.article.translating}</span>
      </div>
    );
  }

  if (translationError) {
    // Silently fall back to original content — no error shown to users
    return null;
  }

  if (isTranslated) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
        <Languages className="w-4 h-4 flex-shrink-0" />
        <span>{t.article.translatedBy}</span>
        <button
          onClick={() => setLanguage('ky')}
          className="ml-auto text-xs underline hover:no-underline text-red-600 dark:text-red-400"
        >
          {t.article.originalLanguage}
        </button>
      </div>
    );
  }

  return null;
}
