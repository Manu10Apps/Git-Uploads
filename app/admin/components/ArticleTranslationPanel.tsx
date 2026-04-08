'use client';

import React, { useState } from 'react';
import { Languages, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { puterTranslateArticle } from '@/lib/puter-translate';

interface ArticleTranslationPanelProps {
  articleId: number | string;
  title: string;
  excerpt: string;
  content: string;
}

interface LangStatus {
  status: 'idle' | 'translating' | 'done' | 'error';
  error?: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'sw', label: 'Kiswahili' },
] as const;

export default function ArticleTranslationPanel({
  articleId,
  title,
  excerpt,
  content,
}: ArticleTranslationPanelProps) {
  const [langStatus, setLangStatus] = useState<Record<string, LangStatus>>({
    en: { status: 'idle' },
    sw: { status: 'idle' },
  });
  const [translatingAll, setTranslatingAll] = useState(false);

  const translateToLang = async (langCode: string) => {
    setLangStatus((prev) => ({ ...prev, [langCode]: { status: 'translating' } }));

    try {
      const result = await puterTranslateArticle(
        { title, excerpt, content },
        'ky',
        langCode as any
      );

      // Save to database
      const res = await fetch('/api/translations/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          language: langCode,
          title: result.title,
          excerpt: result.excerpt,
          content: result.content,
        }),
      });

      if (!res.ok) throw new Error('Failed to save translation');

      setLangStatus((prev) => ({ ...prev, [langCode]: { status: 'done' } }));
    } catch (err: any) {
      setLangStatus((prev) => ({
        ...prev,
        [langCode]: { status: 'error', error: err?.message || 'Translation failed' },
      }));
    }
  };

  const translateAll = async () => {
    setTranslatingAll(true);
    for (const lang of LANGUAGES) {
      if (langStatus[lang.code]?.status === 'done') continue;
      await translateToLang(lang.code);
    }
    setTranslatingAll(false);
  };

  const allDone = LANGUAGES.every((l) => langStatus[l.code]?.status === 'done');
  const anyTranslating = LANGUAGES.some((l) => langStatus[l.code]?.status === 'translating');

  return (
    <div className="mt-8 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Languages className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
          Translate Article
        </h3>
      </div>
      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
        Translate the article title, excerpt, and content to other languages. Translations are saved to the database for instant loading.
      </p>

      <div className="space-y-3 mb-4">
        {LANGUAGES.map((lang) => {
          const st = langStatus[lang.code];
          return (
            <div
              key={lang.code}
              className="flex items-center justify-between bg-white dark:bg-neutral-800 rounded-md px-4 py-3 border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {lang.label}
                </span>
                {st?.status === 'done' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
                {st?.status === 'translating' && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Translating...
                  </span>
                )}
                {st?.status === 'error' && (
                  <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5" /> {st.error}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => translateToLang(lang.code)}
                disabled={st?.status === 'translating' || translatingAll}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white transition-colors"
              >
                {st?.status === 'done' ? 'Re-translate' : 'Translate'}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={translateAll}
        disabled={translatingAll || anyTranslating || allDone}
        className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
      >
        {translatingAll || anyTranslating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Translating...
          </>
        ) : allDone ? (
          <>
            <CheckCircle className="w-4 h-4" />
            All Translations Saved
          </>
        ) : (
          <>
            <Languages className="w-4 h-4" />
            Translate to All Languages
          </>
        )}
      </button>
    </div>
  );
}
