'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header, Footer } from '@/app/components';
import { ArticleImage } from '@/app/components/ArticleImage';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  categoryName: string;
  author?: string;
  publishedAt?: string;
  image?: string;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
          setResults(data.data);
        } else {
          setError(data.error);
          setResults([]);
        }
      } catch (err) {
        setError('Failed to search. Please try again.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [query]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Ubwiya';
    if (diffDays === 1) return 'Igisuba';
    if (diffDays < 7) return `${diffDays} iminsi`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ibyumwe`;
    return date.toLocaleDateString('rw-RW');
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Search Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
              Ibyo Ushaka
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              {query ? (
                <>
                  Ibisubizo bya <span className="font-semibold text-red-700 dark:text-red-600">"{query}"</span>
                  {!isLoading && (
                    <span className="ml-4 text-neutral-500">
                      {results.length} ibisubizo byabonetse
                    </span>
                  )}
                </>
              ) : (
                'Injiza ijambo rihura kugira ngo ubone inkuru'
              )}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                Ibyo usabye biri gushakishwa...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-12">
              <p className="text-lg text-red-600 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && results.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {results.map((article) => (
                <article
                  key={article.id}
                  onClick={() => router.push(`/article/${article.slug}`)}
                  className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                >
                  {article.image && (
                    <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48">
                      <ArticleImage
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="text-red-700 dark:text-red-600 text-xs font-semibold tracking-widest mb-2 uppercase">
                      {article.categoryName}
                    </div>
                    <h3 className="text-lg font-serif font-bold text-neutral-900 dark:text-white mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 font-light">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
                      <span>{article.author}</span>
                      <span>{formatDate(article.publishedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : !isLoading && query ? (
            <div className="text-center py-12">
              <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-4">
                Ibyo ushaka ntibyabonetse "{query}"
              </p>
              <p className="text-neutral-500 dark:text-neutral-500">Gezesha ijambo ritandukanye cyangwa reba mu bikwati</p>
            </div>
          ) : (
            !isLoading && (
              <div className="text-center py-12">
                <p className="text-lg text-neutral-600 dark:text-neutral-400">
                  Kanda aho gushakisha kugira ngo ubone Inkuru
                </p>
              </div>
            )
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Ibyo usabye biri gushakishwa...</div>}>
      <SearchContent />
    </Suspense>
  );
}

