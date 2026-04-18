'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Languages, CheckCircle, Loader2, AlertCircle, Save } from 'lucide-react';

interface ArticleTranslationPanelProps {
  articleId?: number | string | null;
  title: string;
  excerpt: string;
  content: string;
  gallery?: Array<{ url: string; caption: string }>;
  onTranslationsReady?: (translations: Record<string, { title: string; excerpt: string; content: string }>) => void;
}

interface TranslationForm {
  title: string;
  excerpt: string;
  content: string;
}

type LangStatusType = 'idle' | 'loading' | 'loaded' | 'translating' | 'saving' | 'saved' | 'error';

interface LangState {
  status: LangStatusType;
  form: TranslationForm;
  error?: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
] as const;

const emptyForm: TranslationForm = { title: '', excerpt: '', content: '' };

export default function ArticleTranslationPanel({
  articleId,
  title,
  excerpt,
  content,
  gallery,
  onTranslationsReady,
}: ArticleTranslationPanelProps) {
  const isPrePublish = !articleId;
  const [activeTab, setActiveTab] = useState<string>('en');
  const [langs, setLangs] = useState<Record<string, LangState>>({
    en: { status: 'idle', form: { ...emptyForm } },
    sw: { status: 'idle', form: { ...emptyForm } },
  });
  const [translatingAll, setTranslatingAll] = useState(false);

  // Load existing translations from DB on mount (only when articleId is available)
  useEffect(() => {
    if (!articleId) return;
    const loadExisting = async (langCode: string) => {
      setLangs((prev) => ({
        ...prev,
        [langCode]: { ...prev[langCode], status: 'loading' },
      }));
      try {
        const res = await fetch(
          `/api/translations/cache?articleId=${articleId}&lang=${langCode}`
        );
        const json = await res.json();
        if (json.data) {
          setLangs((prev) => ({
            ...prev,
            [langCode]: {
              status: 'loaded',
              form: {
                title: json.data.title || '',
                excerpt: json.data.excerpt || '',
                content: json.data.content || '',
              },
            },
          }));
        } else {
          setLangs((prev) => ({
            ...prev,
            [langCode]: { ...prev[langCode], status: 'idle' },
          }));
        }
      } catch {
        setLangs((prev) => ({
          ...prev,
          [langCode]: { ...prev[langCode], status: 'idle' },
        }));
      }
    };
    LANGUAGES.forEach((l) => loadExisting(l.code));
  }, [articleId]);

  const updateField = useCallback(
    (langCode: string, field: keyof TranslationForm, value: string) => {
      setLangs((prev) => ({
        ...prev,
        [langCode]: {
          ...prev[langCode],
          form: { ...prev[langCode].form, [field]: value },
        },
      }));
    },
    []
  );

  const autoTranslate = async (langCode: string) => {
    console.log(`[ArticleTranslationPanel] autoTranslate: ${langCode}`);
    setLangs((prev) => ({
      ...prev,
      [langCode]: { ...prev[langCode], status: 'translating' },
    }));
    try {
      const apiRes = await fetch('/api/translations/translate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          gallery: gallery || [],
          from: 'ky',
          to: langCode,
        }),
      });

      if (!apiRes.ok) {
        let errorData: any = { error: null };
        const contentType = apiRes.headers.get('content-type');
        try {
          if (contentType?.includes('application/json')) {
            errorData = await apiRes.json();
          } else {
            const text = await apiRes.text();
            errorData = { error: text || `HTTP ${apiRes.status}` };
          }
        } catch (parseErr) {
          errorData = { error: `HTTP ${apiRes.status}` };
        }

        const serviceDetails = errorData?.serviceErrors ? ` Details: ${JSON.stringify(errorData.serviceErrors)}` : '';
        throw new Error(`${errorData?.error || `Translation API returned ${apiRes.status}`}${serviceDetails}`);
      }

      const apiData = await apiRes.json();
      const result = apiData.data;

      console.log(`[ArticleTranslationPanel] ✓ Translation complete for ${langCode}`);
      setLangs((prev) => ({
        ...prev,
        [langCode]: {
          status: 'loaded',
          form: {
            title: result.title || '',
            excerpt: result.excerpt || '',
            content: result.content || '',
          },
        },
      }));
      // Notify parent of ready translations in pre-publish mode
      if (isPrePublish && onTranslationsReady) {
        // Get all current translations including this new one
        setLangs((prev) => {
          const all: Record<string, { title: string; excerpt: string; content: string }> = {};
          for (const l of LANGUAGES) {
            const f = l.code === langCode
              ? { title: result.title || '', excerpt: result.excerpt || '', content: result.content || '' }
              : prev[l.code].form;
            if (f.title.trim() && f.content.trim()) {
              all[l.code] = f;
            }
          }
          onTranslationsReady(all);
          return prev;
        });
      }
    } catch (err: any) {
      console.error(`[ArticleTranslationPanel] Error translating ${langCode}:`, err?.message || err);
      setLangs((prev) => ({
        ...prev,
        [langCode]: {
          ...prev[langCode],
          status: 'error',
          error: err?.message || 'Translation failed',
        },
      }));
    }
  };

  const saveTranslation = async (langCode: string) => {
    const form = langs[langCode].form;
    if (!form.title.trim() || !form.content.trim()) {
      console.warn(`[ArticleTranslationPanel] Skipping save for ${langCode}: missing title or content`);
      return;
    }

    // In pre-publish mode, just mark as ready and notify parent
    if (isPrePublish) {
      console.log(`[ArticleTranslationPanel] Pre-publish mode: marking ${langCode} as saved`);
      setLangs((prev) => ({
        ...prev,
        [langCode]: { ...prev[langCode], status: 'saved', error: undefined },
      }));
      if (onTranslationsReady) {
        const all: Record<string, { title: string; excerpt: string; content: string }> = {};
        for (const l of LANGUAGES) {
          const f = langs[l.code].form;
          if (f.title.trim() && f.content.trim()) {
            all[l.code] = f;
          }
        }
        all[langCode] = form;
        onTranslationsReady(all);
      }
      return;
    }

    console.log(`[ArticleTranslationPanel] Saving ${langCode} translation to database...`);
    setLangs((prev) => ({
      ...prev,
      [langCode]: { ...prev[langCode], status: 'saving' },
    }));
    try {
      const res = await fetch('/api/translations/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          language: langCode,
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
        }),
      });

      const responseData = await res.json();
      
      if (!res.ok) {
        const errorMsg = responseData?.error || `API returned ${res.status}`;
        throw new Error(`Failed to save: ${errorMsg}`);
      }

      console.log(`[ArticleTranslationPanel] ✓ ${langCode} saved successfully:`, responseData);
      setLangs((prev) => ({
        ...prev,
        [langCode]: { ...prev[langCode], status: 'saved', error: undefined },
      }));
    } catch (err: any) {
      const errorMsg = err?.message || 'Save failed';
      console.error(`[ArticleTranslationPanel] Error saving ${langCode}:`, errorMsg);
      setLangs((prev) => ({
        ...prev,
        [langCode]: {
          ...prev[langCode],
          status: 'error',
          error: errorMsg,
        },
      }));
    }
  };

  const translateAndSaveAll = async () => {
    console.log('[ArticleTranslationPanel] Starting translateAndSaveAll:', { isPrePublish, articleId, languageCount: LANGUAGES.length });
    setTranslatingAll(true);
    const allResults: Record<string, { title: string; excerpt: string; content: string }> = {};
    const maxRetries = 2;

    for (const lang of LANGUAGES) {
      // Auto-translate with retry logic
      console.log(`[ArticleTranslationPanel] Translating to ${lang.code}...`);
      setLangs((prev) => ({
        ...prev,
        [lang.code]: { ...prev[lang.code], status: 'translating' },
      }));

      let lastError: any;
      let success = false;

      // Retry loop for transient failures
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const apiRes = await fetch('/api/translations/translate-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              excerpt,
              content,
              gallery: gallery || [],
              from: 'ky',
              to: lang.code,
            }),
          });

          if (!apiRes.ok) {
            // Handle error responses safely (may be HTML or JSON)
            let errorData: any = { error: null };
            const contentType = apiRes.headers.get('content-type');
            
            try {
              if (contentType?.includes('application/json')) {
                errorData = await apiRes.json();
              } else {
                const text = await apiRes.text();
                errorData = { error: text || `HTTP ${apiRes.status}` };
              }
            } catch (parseErr) {
              errorData = { error: `HTTP ${apiRes.status}` };
            }

              const serviceDetails = errorData?.serviceErrors ? ` Details: ${JSON.stringify(errorData.serviceErrors)}` : '';

              // Rate limit - retry with backoff
              if (apiRes.status === 429 && attempt < maxRetries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.warn(`[ArticleTranslationPanel] Rate limited, retrying ${lang.code} after ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }

              // 502/503 Gateway errors - retry as they're transient
              if ((apiRes.status === 502 || apiRes.status === 503) && attempt < maxRetries) {
                const waitTime = (Math.pow(2, attempt) + 1) * 1000; // 2s, 5s, 11s backoff
                console.warn(`[ArticleTranslationPanel] Gateway error ${apiRes.status}, retrying ${lang.code} after ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              }

              throw new Error(`${errorData?.error || `Translation API returned ${apiRes.status}`}${serviceDetails}`);
              [lang.code]: { status: 'saved', form, error: undefined },
            }));
            allResults[lang.code] = form;
          } else {
            setLangs((prev) => ({
              ...prev,
              [lang.code]: { status: 'saving', form },
            }));
            // Save immediately with the result
            console.log(`[ArticleTranslationPanel] Saving "${lang.code}" translation to database...`);
            const res = await fetch('/api/translations/cache', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                articleId,
                language: lang.code,
                title: form.title.trim(),
                excerpt: form.excerpt.trim(),
                content: form.content.trim(),
              }),
            });

            const responseData = await res.json();
            
            if (!res.ok) {
              const errorMsg = responseData?.error || `API returned ${res.status}`;
              throw new Error(`Failed to save: ${errorMsg}`);
            }

            console.log(`[ArticleTranslationPanel] ✓ Translation saved for ${lang.code}:`, responseData);
            setLangs((prev) => ({
              ...prev,
              [lang.code]: { ...prev[lang.code], status: 'saved', error: undefined },
            }));
          }

          success = true;
          break;
        } catch (err: any) {
          lastError = err;
          const errorMsg = err?.message || 'Failed to process translation';
          if (attempt < maxRetries) {
            console.warn(`[ArticleTranslationPanel] Attempt ${attempt + 1} failed for ${lang.code}, retrying:`, errorMsg);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error(`[ArticleTranslationPanel] Error for ${lang.code} after ${attempt + 1} attempts:`, errorMsg);
          }
        }
      }

      // If all retries failed, mark as error but preserve any partial form data
      if (!success) {
        const errorMsg = lastError?.message || 'Failed to process translation';
        setLangs((prev) => ({
          ...prev,
          [lang.code]: {
            ...prev[lang.code],
            status: 'error',
            error: errorMsg,
          },
        }));
      }
    }
    if (isPrePublish && onTranslationsReady && Object.keys(allResults).length > 0) {
      console.log('[ArticleTranslationPanel] Pre-publish complete, calling onTranslationsReady with:', Object.keys(allResults));
      onTranslationsReady(allResults);
    }
    console.log('[ArticleTranslationPanel] translateAndSaveAll complete');
    setTranslatingAll(false);
  };

  const activeLang = langs[activeTab];
  const isBusy =
    activeLang?.status === 'translating' ||
    activeLang?.status === 'saving' ||
    activeLang?.status === 'loading';

  return (
    <div className="mt-8 space-y-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Languages className="w-5 h-5 text-red-700 dark:text-red-400" />
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Article Translations
        </h3>
      </div>

      {/* Translate All button */}
      <button
        type="button"
        onClick={translateAndSaveAll}
        disabled={translatingAll}
        className="mb-6 w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-800 disabled:bg-red-700/50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
      >
        {translatingAll ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Translating {isPrePublish ? 'All...' : '& Saving All...'}
          </>
        ) : (
          <>
            <Languages className="w-4 h-4" />
            {isPrePublish ? 'Auto-Translate All Languages' : 'Auto-Translate & Save All Languages'}
          </>
        )}
      </button>

      {/* Language Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700 mb-0">
        {LANGUAGES.map((lang) => {
          const st = langs[lang.code];
          const isActive = activeTab === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActiveTab(lang.code)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                isActive
                  ? 'border-red-700 text-red-700 dark:text-red-400 dark:border-red-400'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {st?.status === 'saved' && (
                <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              )}
              {(st?.status === 'loaded') && (
                <span className="w-2 h-2 rounded-full bg-blue-500" title="Loaded from DB" />
              )}
              {st?.status === 'error' && (
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Language Form */}
      {LANGUAGES.map((lang) => {
        if (lang.code !== activeTab) return null;
        const st = langs[lang.code];
        return (
          <div
            key={lang.code}
            className="bg-white dark:bg-neutral-900 rounded-b-lg shadow-sm p-4 sm:p-6 lg:p-8 border border-t-0 border-neutral-200 dark:border-neutral-700"
          >
            {/* Status Bar */}
            {st.status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading existing translation...
              </div>
            )}
            {st.status === 'saved' && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-4">
                <CheckCircle className="w-4 h-4" />
                Translation saved successfully!
              </div>
            )}
            {st.status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="w-4 h-4" />
                {st.error}
              </div>
            )}

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Article Title ({lang.label}) *
              </label>
              <input
                type="text"
                placeholder={`Enter ${lang.label} headline`}
                value={st.form.title}
                onChange={(e) => updateField(lang.code, 'title', e.target.value)}
                disabled={isBusy}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none disabled:opacity-50"
              />
            </div>

            {/* Excerpt */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Excerpt / Summary ({lang.label}) *
              </label>
              <textarea
                placeholder={`Brief summary in ${lang.label}`}
                rows={3}
                value={st.form.excerpt}
                onChange={(e) => updateField(lang.code, 'excerpt', e.target.value)}
                disabled={isBusy}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none disabled:opacity-50"
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Article Content ({lang.label}) *
              </label>
              <textarea
                placeholder={`Full article content in ${lang.label}`}
                rows={10}
                value={st.form.content}
                onChange={(e) => updateField(lang.code, 'content', e.target.value)}
                disabled={isBusy}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none font-mono text-sm disabled:opacity-50"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => autoTranslate(lang.code)}
                disabled={isBusy || translatingAll}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
              >
                {st.status === 'translating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    Auto-Translate to {lang.label}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => saveTranslation(lang.code)}
                disabled={
                  isBusy ||
                  translatingAll ||
                  !st.form.title.trim() ||
                  !st.form.content.trim()
                }
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg bg-green-700 hover:bg-green-800 disabled:bg-green-700/50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
              >
                {st.status === 'saving' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isPrePublish ? `Ready ${lang.label}` : `Save ${lang.label} Translation`}
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
