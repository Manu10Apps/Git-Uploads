'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { X, Search } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RelatedSearchResult {
  id: number;
  title: string;
  slug: string;
  categoryName: string;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [relatedResults, setRelatedResults] = useState<RelatedSearchResult[]>([]);
  const [relatedError, setRelatedError] = useState('');
  const router = useRouter();
  const { language } = useAppStore();
  const t = getTranslation(language);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const encodedQuery = encodeURIComponent(query);
      router.push(`/search?q=${encodedQuery}`);
      setQuery('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRelated = (slug: string) => {
    router.push(`/article/${slug}`);
    setQuery('');
    setRelatedResults([]);
    setRelatedError('');
    onClose();
  };

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (!isOpen) return;

    const currentQuery = trimmedQuery;

    if (currentQuery.length < 2) {
      setRelatedResults([]);
      setRelatedError('');
      setIsRelatedLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsRelatedLoading(true);
      setRelatedError('');

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(currentQuery)}&limit=6`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setRelatedResults([]);
          setRelatedError(data.error || 'Failed to load related searches');
          return;
        }

        const nextResults = Array.isArray(data.data)
          ? data.data.map((item: any) => ({
              id: Number(item.id),
              title: String(item.title || ''),
              slug: String(item.slug || ''),
              categoryName: String(item.categoryName || ''),
            }))
          : [];

        setRelatedResults(nextResults);
      } catch {
        setRelatedResults([]);
        setRelatedError('Failed to load related searches');
      } finally {
        setIsRelatedLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-start justify-center pt-10 sm:pt-20"
        role="dialog"
        aria-labelledby="search-modal-title"
        aria-modal="true"
      >
        <div className="w-full max-w-2xl mx-4 bg-white dark:bg-neutral-900 rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2
              id="search-modal-title"
              className="text-lg font-semibold text-neutral-900 dark:text-white"
            >
              {t.common.searchNews}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Close search modal"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" aria-hidden="true" />
              <input
                type="text"
                placeholder={t.common.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search query"
                className="w-full pl-10 pr-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                autoFocus
              />
            </div>

            {trimmedQuery.length >= 2 && (
              <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700">
                  Ibifitanye isano n'ibyo ushaka
                </div>

                {isRelatedLoading ? (
                  <div className="px-3 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    {t.common.searching}
                  </div>
                ) : relatedError ? (
                  <div className="px-3 py-3 text-sm text-red-600 dark:text-red-400">{relatedError}</div>
                ) : relatedResults.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-neutral-500 dark:text-neutral-400">
                    No related searches found
                  </div>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {relatedResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectRelated(result.slug)}
                          className="w-full text-left px-3 py-2 hover:bg-white dark:hover:bg-neutral-700 transition-colors"
                        >
                          <div className="text-sm font-medium text-neutral-900 dark:text-white line-clamp-1">
                            {result.title}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{result.categoryName}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              aria-busy={isLoading}
              className="mt-4 w-full px-4 py-3 bg-red-700 hover:bg-red-800 disabled:bg-red-700/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? t.common.searching : t.common.search}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

