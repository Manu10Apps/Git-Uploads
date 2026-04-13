'use client';

import React from 'react';
import Link from 'next/link';
import { ArticleImage } from '@/app/components/ArticleImage';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import type { HomepageArticle } from '@/lib/homepage-data';

type TranslationMap = Record<number, { title: string; excerpt: string }>;

type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  thumbnailFallback?: string;
  duration?: string;
  publishedAt?: string;
};

type HomePageFeedProps = {
  articles: HomepageArticle[];
  mostViewed: HomepageArticle[];
};

const LATEST_PAGE_SIZE = 6;
const MOST_VIEWED_PAGE_SIZE = 3;

function getPageItems<T>(items: T[], page: number, pageSize: number) {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

function PagerControls({
  page,
  totalPages,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  label,
}: {
  page: number;
  totalPages: number;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end" aria-label={label}>
      <button
        type="button"
        onClick={onFirst}
        disabled={page === 0}
        className="inline-flex h-10 min-w-10 sm:h-8 sm:min-w-8 px-1 items-center justify-center rounded shadow font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: '#ff2000' }}
        onMouseEnter={(event) => {
          if (!event.currentTarget.disabled) {
            event.currentTarget.style.backgroundColor = '#ff2000';
            event.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = '';
          event.currentTarget.style.color = '#ff2000';
        }}
        aria-label="First page"
      >
        {'<<'}
      </button>
      <button
        type="button"
        onClick={onPrevious}
        disabled={page === 0}
        className="inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded shadow font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: '#ff2000' }}
        onMouseEnter={(event) => {
          if (!event.currentTarget.disabled) {
            event.currentTarget.style.backgroundColor = '#ff2000';
            event.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = '';
          event.currentTarget.style.color = '#ff2000';
        }}
        aria-label="Previous articles"
      >
        {'<'}
      </button>
      <span className="text-xs text-neutral-500 dark:text-neutral-400 min-w-14 text-center">
        {page + 1}/{totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className="inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded shadow font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: '#ff2000' }}
        onMouseEnter={(event) => {
          if (!event.currentTarget.disabled) {
            event.currentTarget.style.backgroundColor = '#ff2000';
            event.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = '';
          event.currentTarget.style.color = '#ff2000';
        }}
        aria-label="Next articles"
      >
        {'>'}
      </button>
      <button
        type="button"
        onClick={onLast}
        disabled={page >= totalPages - 1}
        className="inline-flex h-10 min-w-10 sm:h-8 sm:min-w-8 px-1 items-center justify-center rounded shadow font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: '#ff2000' }}
        onMouseEnter={(event) => {
          if (!event.currentTarget.disabled) {
            event.currentTarget.style.backgroundColor = '#ff2000';
            event.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = '';
          event.currentTarget.style.color = '#ff2000';
        }}
        aria-label="Last page"
      >
        {'>>'}
      </button>
    </div>
  );
}

export function HomePageFeed({ articles, mostViewed }: HomePageFeedProps) {
  const language = useAppStore((s) => s.language);
  const t = getTranslation(language);
  const [latestPage, setLatestPage] = React.useState(0);
  const [mostViewedPage, setMostViewedPage] = React.useState(0);
  const [youtubeVideos, setYouTubeVideos] = React.useState<YouTubeVideo[]>([]);
  const [youtubeLoading, setYouTubeLoading] = React.useState(true);
  const [translations, setTranslations] = React.useState<TranslationMap>({});

  const latestTotalPages = Math.max(1, Math.ceil(articles.length / LATEST_PAGE_SIZE));
  const mostViewedTotalPages = Math.max(1, Math.ceil(mostViewed.length / MOST_VIEWED_PAGE_SIZE));
  const latestPageArticles = getPageItems(articles, latestPage, LATEST_PAGE_SIZE);
  const mostViewedPageArticles = getPageItems(mostViewed, mostViewedPage, MOST_VIEWED_PAGE_SIZE);

  React.useEffect(() => {
    setLatestPage(0);
    setMostViewedPage(0);
  }, [articles.length, mostViewed.length]);

  React.useEffect(() => {
    let cancelled = false;

    const fetchYouTubeVideos = async () => {
      try {
        setYouTubeLoading(true);
        const response = await fetch('/api/youtube/latest');
        const data = await response.json();
        if (!cancelled) {
          if (data?.success && Array.isArray(data.data)) {
            setYouTubeVideos(data.data.slice(0, 4));
          } else {
            setYouTubeVideos([]);
          }
        }
      } catch {
        if (!cancelled) {
          setYouTubeVideos([]);
        }
      } finally {
        if (!cancelled) {
          setYouTubeLoading(false);
        }
      }
    };

    fetchYouTubeVideos();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch article translations when language changes
  React.useEffect(() => {
    if (language === 'ky') {
      setTranslations({});
      return;
    }

    const allIds = [...new Set([...articles, ...mostViewed].map((a) => a.id))];
    if (allIds.length === 0) return;

    let cancelled = false;
    const fetchTranslations = async () => {
      try {
        const res = await fetch(
          `/api/translations/batch?ids=${allIds.join(',')}&lang=${language}`
        );
        const json = await res.json();
        if (!cancelled && json.data) {
          setTranslations(json.data);
        }
      } catch {
        // fallback to originals
      }
    };
    fetchTranslations();
    return () => { cancelled = true; };
  }, [language, articles, mostViewed]);

  const getTitle = (article: HomepageArticle) => {
    if (language === 'ky') return article.title;
    return translations[article.id]?.title || article.title;
  };

  const getExcerpt = (article: HomepageArticle) => {
    if (language === 'ky') return article.excerpt;
    return translations[article.id]?.excerpt || article.excerpt;
  };

  const slugToNavKey: Record<string, keyof typeof t.nav> = {
    amakuru: 'news',
    politiki: 'politics',
    ubuzima: 'health',
    uburezi: 'education',
    ubukungu: 'business',
    siporo: 'sports',
    ikoranabuhanga: 'technology',
    imyidagaduro: 'entertainment',
    ubutabera: 'justice',
    ibidukikije: 'environment',
    imyemerere: 'faith',
    'afurika-yiburasirazuba': 'eastAfrica',
    'mu-mahanga': 'international',
    ubushakashatsi: 'investigations',
    umumare: 'culture',
  };

  const getCategoryLabel = (category?: string | null) => {
    if (!category) return 'General';
    const slug = category.trim().toLowerCase();
    const navKey = slugToNavKey[slug];
    if (navKey && (t.nav as Record<string, string>)[navKey]) {
      return (t.nav as Record<string, string>)[navKey];
    }
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  return (
    <>
      <section className="py-8 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col items-center justify-center gap-3 lg:min-h-10 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="text-center lg:text-left">
              <div className="imv-header-nav mb-2">
                <div className="imv-header-nav-title">
                  {t.home.latestArticles}
                  <span className="a1" />
                  <span className="a2" />
                  <span className="a3" />
                  <span className="a4" />
                </div>
              </div>
            </div>
            <PagerControls
              page={latestPage}
              totalPages={latestTotalPages}
              onFirst={() => setLatestPage(0)}
              onPrevious={() => setLatestPage((prev) => Math.max(0, prev - 1))}
              onNext={() => setLatestPage((prev) => Math.min(latestTotalPages - 1, prev + 1))}
              onLast={() => setLatestPage(Math.max(0, latestTotalPages - 1))}
              label="Latest section pagination"
            />
          </div>

          {latestPageArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {latestPageArticles.map((article) => (
                <article
                  key={article.id}
                  className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                >
                  <Link href={`/article/${article.slug}`}>
                    <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-36 sm:h-40">
                      <ArticleImage
                        src={article.image}
                        alt={getTitle(article)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="text-red-600 dark:text-red-500 text-xs font-semibold tracking-widest mb-2 uppercase">
                      {getCategoryLabel(article.category)}
                    </div>
                    <h3 className="text-lg font-serif font-bold text-neutral-900 dark:text-white mb-3 line-clamp-2">
                      <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                        {getTitle(article)}
                      </Link>
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 font-light">
                      {getExcerpt(article)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
                      <span>{article.publishedAt}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-neutral-600 dark:text-neutral-400">{t.home.noArticles}</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-8 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col items-center justify-center gap-3 lg:min-h-10 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="text-center lg:text-left">
              <div className="imv-header-nav mb-2">
                <div className="imv-header-nav-title">
                  {t.home.mostViewedArticles}
                  <span className="a1" />
                  <span className="a2" />
                  <span className="a3" />
                  <span className="a4" />
                </div>
              </div>
            </div>
            <PagerControls
              page={mostViewedPage}
              totalPages={mostViewedTotalPages}
              onFirst={() => setMostViewedPage(0)}
              onPrevious={() => setMostViewedPage((prev) => Math.max(0, prev - 1))}
              onNext={() => setMostViewedPage((prev) => Math.min(mostViewedTotalPages - 1, prev + 1))}
              onLast={() => setMostViewedPage(Math.max(0, mostViewedTotalPages - 1))}
              label="Most viewed section pagination"
            />
          </div>

          {mostViewedPageArticles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {mostViewedPageArticles.map((article) => (
                <article
                  key={article.id}
                  className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 hover:shadow-lg transition-all duration-300"
                >
                  <Link href={`/article/${article.slug}`}>
                    <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-700 h-56 cursor-pointer">
                      <ArticleImage
                        src={article.image}
                        alt={getTitle(article)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  <div className="p-5">
                    <div className="text-red-600 dark:text-red-500 text-xs font-semibold tracking-widest mb-2 uppercase">
                      {getCategoryLabel(article.category)}
                    </div>
                    <h3 className="text-base font-serif font-bold text-neutral-900 dark:text-white mb-2 line-clamp-2">
                      <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                        {getTitle(article)}
                      </Link>
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                      {getExcerpt(article)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{article.author}</span>
                      <span>{article.publishedAt}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {/* Advert section below Most Viewed */}
          <div className="mt-8 py-4 border-t border-neutral-200 dark:border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 text-center">{t.article.advertLabel}</p>
            {/* Mobile: Full width single ad */}
            <div className="md:hidden">
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-64 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            </div>
            {/* Tablet & Desktop: Two-column grid ad layout */}
            <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-[74px] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-[74px] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3 lg:justify-between">
              <div className="imv-header-nav">
                <div className="imv-header-nav-title">
                  {t.home.latestVideos}
                  <span className="a1" />
                  <span className="a2" />
                  <span className="a3" />
                  <span className="a4" />
                </div>
              </div>
            </div>

            {youtubeLoading ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={`youtube-skeleton-${index}`} className="animate-pulse">
                    <div className="aspect-video rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-3 h-4 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                ))}
              </div>
            ) : youtubeVideos.length > 0 ? (
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-4">
                {youtubeVideos.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all duration-300 bg-white dark:bg-neutral-800"
                    aria-label={video.title}
                  >
                    <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(event) => {
                          const image = event.currentTarget;
                          if (video.thumbnailFallback && image.src !== video.thumbnailFallback) {
                            image.src = video.thumbnailFallback;
                          }
                        }}
                      />
                      {video.publishedAt?.startsWith('[LIVE]') && (
                        <span
                          className="absolute top-2 left-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold text-white shadow-sm animate-[pulse_1.8s_ease-in-out_infinite]"
                          style={{ backgroundColor: 'rgb(226, 0, 26)' }}
                        >
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                            <path d="M5 8C2.5 10.5 2.5 13.5 5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M19 8C21.5 10.5 21.5 13.5 19 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M8 6C4.5 9.5 4.5 14.5 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M16 6C19.5 9.5 19.5 14.5 16 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          LIVE
                        </span>
                      )}
                      {video.duration && (
                        <span className="absolute bottom-2 right-2 rounded bg-black/85 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                          {video.duration}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-semibold leading-snug text-neutral-900 dark:text-white line-clamp-2 transition-colors group-hover:text-red-700 dark:group-hover:text-red-400">
                        {video.title}
                      </h3>
                      {video.publishedAt && (
                        video.publishedAt.startsWith('[LIVE]') ? (
                          <div className="mt-1.5">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-white font-bold rounded-md transition-colors text-[11px] sm:text-xs border border-red-700/60 dark:border-red-200/50 shadow-[0_0_12px_rgba(226,0,26,0.28)] animate-[pulse_1.8s_ease-in-out_infinite]"
                              style={{ backgroundColor: 'rgb(226, 0, 26)' }}
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <circle cx="12" cy="12" r="3" fill="currentColor" />
                                <path d="M5 8C2.5 10.5 2.5 13.5 5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M19 8C21.5 10.5 21.5 13.5 19 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M8 6C4.5 9.5 4.5 14.5 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                <path d="M16 6C19.5 9.5 19.5 14.5 16 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                              LIVE
                            </span>
                          </div>
                        ) : (
                          <p className="mt-1 text-xs line-clamp-1 text-neutral-500 dark:text-neutral-400">
                            {video.publishedAt}
                          </p>
                        )
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {t.home.noVideos}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}