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
const OLD_NEWS_PAGE_SIZE = 12;

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
  const buttonBaseClass = "relative h-10 w-10 sm:h-9 sm:w-9 flex items-center justify-center rounded-lg font-semibold transition-all duration-300 text-sm overflow-hidden group";
  const activeButtonClass = `${buttonBaseClass} bg-gradient-to-br from-red-500 to-red-700 text-white shadow-md hover:shadow-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-900`;
  const disabledButtonClass = `${buttonBaseClass} bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-50`;

  return (
    <div className="modern-pagination" aria-label={label}>
      <button
        type="button"
        onClick={onFirst}
        disabled={page === 0}
        className={page === 0 ? disabledButtonClass : activeButtonClass}
        aria-label="First page"
        title="Go to first page"
      >
        <span className="relative z-10 leading-none">⟨⟨</span>
      </button>
      <button
        type="button"
        onClick={onPrevious}
        disabled={page === 0}
        className={page === 0 ? disabledButtonClass : activeButtonClass}
        aria-label="Previous articles"
        title="Previous page"
      >
        <span className="relative z-10 leading-none">⟨</span>
      </button>
      <div className="modern-page-indicator">
        <span className="modern-page-number">{page + 1}</span>
        <span className="modern-page-separator">/</span>
        <span className="modern-page-total">{totalPages}</span>
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className={page >= totalPages - 1 ? disabledButtonClass : activeButtonClass}
        aria-label="Next articles"
        title="Next page"
      >
        <span className="relative z-10 leading-none">⟩</span>
      </button>
      <button
        type="button"
        onClick={onLast}
        disabled={page >= totalPages - 1}
        className={page >= totalPages - 1 ? disabledButtonClass : activeButtonClass}
        aria-label="Last page"
        title="Go to last page"
      >
        <span className="relative z-10 leading-none">⟩⟩</span>
      </button>
    </div>
  );
}

// Categories to display in the headlines grid
const CATEGORY_HEADLINES = [
  'politiki',
  'ubuzima', 
  'uburezi',
  'ubukungu',
  'ikoranabuhanga',
  'imyidagaduro',
  'ubutabera',
  'ibidukikije',
  'imyemerere',
  'africa-ylburasirazuba',
];

export function HomePageFeed({ articles, mostViewed }: HomePageFeedProps) {
  const language = useAppStore((s) => s.language);
  const t = getTranslation(language);
  const [latestPage, setLatestPage] = React.useState(0);
  const [mostViewedPage, setMostViewedPage] = React.useState(0);
  const [oldNewsPage, setOldNewsPage] = React.useState(0);
  const [youtubeVideos, setYouTubeVideos] = React.useState<YouTubeVideo[]>([]);
  const [youtubeLoading, setYouTubeLoading] = React.useState(true);
  const [translations, setTranslations] = React.useState<TranslationMap>({});
  const [categoryArticles, setCategoryArticles] = React.useState<HomepageArticle[]>([]);
  const [sportsArticles, setSportsArticles] = React.useState<HomepageArticle[]>([]);

  const latestLimited = articles ? articles.slice(0, 6) : [];
  const latestTotalPages = latestLimited.length ? Math.max(1, Math.ceil(latestLimited.length / LATEST_PAGE_SIZE)) : 1;
  const mostViewedLimited = mostViewed ? mostViewed.slice(0, 10) : [];
  const mostViewedTotalPages = mostViewedLimited.length ? Math.max(1, Math.ceil(mostViewedLimited.length / MOST_VIEWED_PAGE_SIZE)) : 1;
  const latestPageArticles = getPageItems(latestLimited, latestPage, LATEST_PAGE_SIZE);
  const mostViewedPageArticles = getPageItems(mostViewedLimited, mostViewedPage, MOST_VIEWED_PAGE_SIZE);

  // Old news: all articles minus the 6 latest
  const oldNewsArticles = articles && articles.length > LATEST_PAGE_SIZE ? articles.slice(LATEST_PAGE_SIZE) : [];
  const oldNewsTotalPages = oldNewsArticles.length ? Math.max(1, Math.ceil(oldNewsArticles.length / OLD_NEWS_PAGE_SIZE)) : 1;
  const oldNewsPageArticles = getPageItems(oldNewsArticles, oldNewsPage, OLD_NEWS_PAGE_SIZE);

  React.useEffect(() => {
    setLatestPage(0);
    setMostViewedPage(0);
    setOldNewsPage(0);
  }, [articles.length, mostViewed.length]);

  // Fetch category articles
  React.useEffect(() => {
    if (!articles || articles.length === 0) {
      setCategoryArticles([]);
      return;
    }

    // Get most viewed article from each category
    const topByCategory: Record<string, HomepageArticle> = {};
    articles.forEach((article) => {
      const categorySlug = article.category.toLowerCase();
      if (CATEGORY_HEADLINES.includes(categorySlug)) {
        if (!topByCategory[categorySlug] || (article.views || 0) > (topByCategory[categorySlug].views || 0)) {
          topByCategory[categorySlug] = article;
        }
      }
    });

    // Build array in the order of CATEGORY_HEADLINES
    const orderedArticles = CATEGORY_HEADLINES
      .map((cat) => topByCategory[cat])
      .filter((article): article is HomepageArticle => article !== undefined)
      .slice(0, 10);

    setCategoryArticles(orderedArticles);
  }, [articles]);

  // Fetch sports articles
  React.useEffect(() => {
    if (!articles || articles.length === 0) {
      setSportsArticles([]);
      return;
    }

    // Filter articles by sports category
    const sportsList = articles
      .filter((article) => article.category.toLowerCase() === 'sports')
      .slice(0, 5);

    setSportsArticles(sportsList);
  }, [articles]);

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
          <div className="mb-6 flex flex-col items-center justify-center gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="branded--bar collection-title--plain collection-title--small" data-testid="branded-collection-title-bar">
              {t.home.latestArticles}
            </h2>
            {latestTotalPages > 1 && (
              <PagerControls
                page={latestPage}
                totalPages={latestTotalPages}
                onFirst={() => setLatestPage(0)}
                onPrevious={() => setLatestPage((prev) => Math.max(0, prev - 1))}
                onNext={() => setLatestPage((prev) => Math.min(latestTotalPages - 1, prev + 1))}
                onLast={() => setLatestPage(Math.max(0, latestTotalPages - 1))}
                label="Latest section pagination"
              />
            )}
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
          <div className="mb-6 flex flex-col items-center justify-center gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="branded--bar collection-title--plain collection-title--small" data-testid="branded-collection-title-bar">
              {t.home.mostViewedArticles}
            </h2>
            {mostViewedTotalPages > 1 && (
              <PagerControls
                page={mostViewedPage}
                totalPages={mostViewedTotalPages}
                onFirst={() => setMostViewedPage(0)}
                onPrevious={() => setMostViewedPage((prev) => Math.max(0, prev - 1))}
                onNext={() => setMostViewedPage((prev) => Math.min(mostViewedTotalPages - 1, prev + 1))}
                onLast={() => setMostViewedPage(Math.max(0, mostViewedTotalPages - 1))}
                label="Most viewed section pagination"
              />
            )}
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
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-[74px] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            </div>
            {/* Tablet & Desktop: Two-column grid ad layout */}
            <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">{t.article.advertSpace}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Old News Section */}
      {oldNewsArticles.length > 0 && (
        <section className="py-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col items-center justify-center gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="branded--bar collection-title--plain collection-title--small" data-testid="branded-collection-title-bar">
                {t.home.oldNews}
              </h2>
              {oldNewsTotalPages > 1 && (
                <PagerControls
                  page={oldNewsPage}
                  totalPages={oldNewsTotalPages}
                  onFirst={() => setOldNewsPage(0)}
                  onPrevious={() => setOldNewsPage((prev) => Math.max(0, prev - 1))}
                  onNext={() => setOldNewsPage((prev) => Math.min(oldNewsTotalPages - 1, prev + 1))}
                  onLast={() => setOldNewsPage(Math.max(0, oldNewsTotalPages - 1))}
                  label="Old news section pagination"
                />
              )}
            </div>

            {oldNewsPageArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 lg:gap-8">
                {oldNewsPageArticles.map((article) => (
                  <article
                    key={article.id}
                    className="group border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    <Link href={`/article/${article.slug}`}>
                      <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-700 aspect-video cursor-pointer">
                        <ArticleImage
                          src={article.image}
                          alt={getTitle(article)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </Link>
                    <div className="p-3 flex-grow flex flex-col">
                      <h3 className="text-sm font-serif font-bold text-neutral-900 dark:text-white line-clamp-2 flex-grow">
                        <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                          {getTitle(article)}
                        </Link>
                      </h3>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Sports Section */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 pt-6">
          <h2 className="branded--bar collection-title--plain collection-title--small" data-testid="branded-collection-title-bar">
            {t.home.mustRead}
          </h2>
        </div>
        {/* Sports Section */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Featured Sports */}
          <div className="relative w-full lg:w-[770px] h-[400px] md:h-[500px] lg:h-[625px] overflow-hidden flex items-center justify-center group">
            <div className="absolute w-[715px] h-[300px] opacity-85 bg-cover bg-center" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80)', marginLeft: '7px', marginTop: '-30px', marginBottom: '150px', borderRadius: '10px'}}></div>
            <div className="absolute bg-neutral-100 dark:bg-neutral-800 flex gap-3" style={{width: '630px', height: '350px', marginTop: '280px', marginLeft: '10px', marginBottom: '25px', borderRadius: '20px', padding: '8px'}}>
              <div className="absolute z-10" style={{top: '5px', left: '10px', marginLeft: '-45px', marginTop: '-10px'}}>
                <div className="mb-2 h-1 w-4 bg-[#f61f00] rounded-full shadow-md"></div>
                <h2 className="text-3xl font-bold text-white tracking-widest drop-shadow-lg" style={{writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontFamily: 'Roboto Condensed', WebkitTextStroke: '0.6px black', textShadow: 'black 0.6px 0, black -0.6px 0, black 0 0.6px, black 0 -0.6px'}}>
                  {t.nav.sports || 'SIPORO'}
                </h2>
              </div>
              {/* Left column: First 4 articles stacked vertically */}
              <div className="flex flex-col relative" style={{width: '335px', height: '350px', overflow: 'hidden'}}>
                {sportsArticles.slice(0, 4).map((article) => (
                  <article key={article.id} className="gc u-clickable-card gc--type-post gc--with-image flex items-center gap-2 flex-shrink-0" style={{width: '335px', height: '83px'}}>
                    <div className="gc__image-wrap flex-shrink-0" style={{width: '113px', height: '83px', overflow: 'hidden', borderRadius: '10px'}}>
                      <ArticleImage
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="gc__content flex-grow">
                      <h3 className="gc__title text-xs font-bold leading-tight line-clamp-3">
                        <Link href={`/${article.category}/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-[#f61f00]">
                          {article.title}
                        </Link>
                      </h3>
                    </div>
                  </article>
                ))}
              </div>
              {/* Right column: Last article */}
              {sportsArticles.length > 4 && (
                <article className="gc u-clickable-card gc--type-post gc--with-image flex flex-col flex-shrink-0" style={{width: '335px', height: '385px'}}>
                  <div className="gc__image-wrap flex-shrink-0" style={{width: '330px', height: '220px', overflow: 'hidden', borderRadius: '10px'}}>
                    <ArticleImage
                      src={sportsArticles[4].image}
                      alt={sportsArticles[4].title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="gc__content p-2 flex-grow flex flex-col">
                    <h3 className="gc__title text-xs font-bold leading-tight line-clamp-3">
                      <Link href={`/${sportsArticles[4].category}/${sportsArticles[4].slug}`} className="text-neutral-900 dark:text-white hover:text-[#f61f00]">
                        {sportsArticles[4].title}
                      </Link>
                    </h3>
                    <div className="gc__excerpt text-xs text-neutral-600 dark:text-neutral-400 line-clamp-4 mt-2">
                      <p>{sportsArticles[4].excerpt}</p>
                    </div>
                  </div>
                </article>
              )}
            </div>
          </div>

          {/* Right: 10 Categories Headlines Grid */}
          <div className="w-full lg:w-[450px] h-[500px] lg:h-[650px] bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6 overflow-y-auto" style={{marginTop: '20px', marginBottom: '50px'}}>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="h-1 w-4 bg-[#f61f00] rounded-full inline-block"></span>
              {t.home.topHeadlines}
            </h3>
            <ol className="space-y-3">
              {categoryArticles.length > 0 ? (
                categoryArticles.map((article, index) => (
                  <li key={article.id} className={index < categoryArticles.length - 1 ? "flex gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700" : "flex gap-3"}>
                    <span className="flex-shrink-0 text-lg font-bold text-[#f61f00] opacity-70 w-6">{index + 1}</span>
                    <Link href={`/${article.category}/${article.slug}`} className="text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-[#f61f00] line-clamp-2">
                      {article.title}
                    </Link>
                  </li>
                ))
              ) : (
                // Fallback static headlines if no articles loaded
                <>
                  <li className="flex gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="flex-shrink-0 text-lg font-bold text-[#f61f00] opacity-70 w-6">1</span>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 line-clamp-2">Loading headlines...</span>
                  </li>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <li key={i} className={i < 8 ? "flex gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-700" : "flex gap-3"}>
                      <span className="flex-shrink-0 text-lg font-bold text-[#f61f00] opacity-70 w-6">{i + 2}</span>
                      <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500 line-clamp-2">—</span>
                    </li>
                  ))}
                </>
              )}
            </ol>
          </div>
        </div>
      </section>

      {/* Latest Videos Section */}
      <section className="py-8 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="branded--bar collection-title--plain collection-title--small" data-testid="branded-collection-title-bar">
              {t.home.latestVideos}
            </h2>
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
      </section>
    </>
  );
}