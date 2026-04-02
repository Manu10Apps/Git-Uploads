'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { Header, Footer, BreakingNewsCarousel } from './components';
import { ArticleImage } from '@/app/components/ArticleImage';

export default function Home() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [youtubeVideos, setYouTubeVideos] = useState<Array<{ id: string; title: string; url: string; thumbnail: string; thumbnailFallback?: string; duration?: string; publishedAt?: string }>>([]);
  const [youtubeLoading, setYouTubeLoading] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [mostViewed, setMostViewed] = useState<any[]>([]);
  const [adverts, setAdverts] = useState<any[]>([]);
  const [advertsLoading, setAdvertsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [latestPage, setLatestPage] = useState(0);
  const [mostViewedPage, setMostViewedPage] = useState(0);

  const FEATURED_PAGE_SIZE = 5;
  const LATEST_PAGE_SIZE = 6;
  const MOST_VIEWED_PAGE_SIZE = 3;

  const getPageItems = (items: any[], page: number, pageSize: number) => {
    const start = page * pageSize;
    return items.slice(start, start + pageSize);
  };

  const latestTotalPages = Math.max(1, Math.ceil(articles.length / LATEST_PAGE_SIZE));
  const mostViewedTotalPages = Math.max(1, Math.ceil(mostViewed.length / MOST_VIEWED_PAGE_SIZE));

  const featuredPageArticles = articles.slice(0, FEATURED_PAGE_SIZE);
  const featuredArticle = featuredPageArticles.find((a: any) => a.featured) || featuredPageArticles[0] || null;
  const featuredRemainingArticles = featuredPageArticles.filter((a: any) => featuredArticle && a.id !== featuredArticle.id);
  const secondaryFeaturedArticles = featuredRemainingArticles.slice(0, 2);
  const rightFeaturedArticles = featuredRemainingArticles.slice(2, 4);
  const latestPageArticles = getPageItems(articles, latestPage, LATEST_PAGE_SIZE);
  const mostViewedPageArticles = getPageItems(mostViewed, mostViewedPage, MOST_VIEWED_PAGE_SIZE);
  const homepageTopAdverts = adverts.filter((ad: any) => ad.position === 'homepage_top' && ad.isActive);
  const homepageBottomAdverts = adverts.filter((ad: any) => ad.position === 'homepage_bottom' && ad.isActive);
  const latestSkeletonItems = Array.from({ length: LATEST_PAGE_SIZE }, (_, index) => index);
  const mostViewedSkeletonItems = Array.from({ length: MOST_VIEWED_PAGE_SIZE }, (_, index) => index);

  const PagerControls = ({
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
  }) => (
    <div className="flex items-center gap-2" aria-label={label}>
      <button
        type="button"
        onClick={onFirst}
        disabled={page === 0}
        className="inline-flex h-10 min-w-10 sm:h-8 sm:min-w-8 px-1 items-center justify-center rounded shadow font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        style={{ color: '#ff2000' }}
        onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = '#ff2000'; e.currentTarget.style.color = '#ffffff'; } }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#ff2000'; }}
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
        onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = '#ff2000'; e.currentTarget.style.color = '#ffffff'; } }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#ff2000'; }}
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
        onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = '#ff2000'; e.currentTarget.style.color = '#ffffff'; } }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#ff2000'; }}
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
        onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = '#ff2000'; e.currentTarget.style.color = '#ffffff'; } }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = '#ff2000'; }}
        aria-label="Last page"
      >
        {'>>'}
      </button>
    </div>
  );

  const FeaturedSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-2 animate-pulse">
        <div className="mb-4 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-800 h-48 sm:h-64 md:h-80 lg:h-96" />
        <div className="h-6 w-5/6 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
        <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
      <div className="md:col-span-1 flex flex-col gap-4">
        {[0, 1].map((item) => (
          <div key={item} className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0 animate-pulse">
            <div className="mb-3 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-800 h-32" />
            <div className="h-5 w-4/5 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
      <div className="md:col-span-1 flex flex-col gap-4">
        {[0, 1].map((item) => (
          <div key={item} className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0 animate-pulse">
            <div className="mb-3 rounded overflow-hidden bg-neutral-200 dark:bg-neutral-800 h-32" />
            <div className="h-5 w-4/5 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const LatestCardSkeleton = () => (
    <article className="border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 animate-pulse">
      <div className="overflow-hidden bg-neutral-200 dark:bg-neutral-800 h-24" />
      <div className="p-3 sm:p-4 md:p-6">
        <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-5 w-full bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-5 w-4/5 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
        <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
        <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded mb-4" />
        <div className="h-3 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded" />
      </div>
    </article>
  );

  const MostViewedCardSkeleton = () => (
    <article className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 animate-pulse">
      <div className="overflow-hidden bg-neutral-200 dark:bg-neutral-700 h-56" />
      <div className="p-5">
        <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
        <div className="h-5 w-full bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
        <div className="h-5 w-4/5 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
        <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded mb-2" />
        <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded mb-3" />
        <div className="flex items-center justify-between">
          <div className="h-3 w-1/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-1/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    </article>
  );

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/articles?limit=24&summary=true');
        const data = await response.json();
        const allArticles = data.data || [];
        
        // Find featured article
        setArticles(allArticles);
        
        // Set most viewed (featured articles + random mix)
        const mostViewedArticles = [...allArticles].sort((a: any, b: any) => (b.views || 0) - (a.views || 0));
        setMostViewed(mostViewedArticles);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAdverts = async () => {
      try {
        const response = await fetch('/api/adverts');
        const data = await response.json();
        setAdverts(data.data || []);
      } catch (error) {
        console.error('Failed to fetch adverts:', error);
      } finally {
        setAdvertsLoading(false);
      }
    };

    const fetchYouTubeVideos = async () => {
      try {
        setYouTubeLoading(true);
        const response = await fetch('/api/youtube/latest');
        const data = await response.json();
        if (data?.success && Array.isArray(data.data)) {
          setYouTubeVideos(data.data.slice(0, 4));
        } else {
          setYouTubeVideos([]);
        }
      } catch (error) {
        console.error('Failed to fetch YouTube videos:', error);
        setYouTubeVideos([]);
      } finally {
        setYouTubeLoading(false);
      }
    };

    fetchArticles();
    fetchAdverts();
    fetchYouTubeVideos();
  }, []);

  useEffect(() => {
    setLatestPage(0);
    setMostViewedPage(0);
  }, [articles.length]);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        {/* Breaking News Carousel - Hidden on mobile, shown on md and above */}
        <div className="hidden md:block">
          <BreakingNewsCarousel articles={articles.slice(0, 5)} />
        </div>

        {/* Featured Investigation */}
        {/* Featured Three-Column Grid Layout */}
        <section className="py-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <FeaturedSkeleton />
            ) : featuredArticle && featuredPageArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Main Featured Article - Left Column */}
                <div className="md:col-span-2">
                  <article className="flex flex-col h-full">
                    <Link href={`/article/${featuredArticle.slug}`}>
                        <div className="mb-4 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 h-48 sm:h-64 md:h-80 lg:h-96 cursor-pointer hover:opacity-90 transition-opacity">
                          <ArticleImage
                            src={featuredArticle.image}
                            alt={featuredArticle.title}
                            loading="eager"
                            fetchPriority="high"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>
                    <div className="flex-grow">
                      <h3 className="text-xl font-serif font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                        <Link href={`/article/${featuredArticle.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                          {featuredArticle.title}
                        </Link>
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                        <span>{featuredArticle.author}</span>
                        <span>•</span>
                        <span>{featuredArticle.publishedAt}</span>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Secondary Articles - Middle Column */}
                <div className="md:col-span-1 flex flex-col gap-4">
                  {secondaryFeaturedArticles.map((article) => (
                    <article key={article.id} className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0">
                      <Link href={`/article/${article.slug}`}>
                          <div className="mb-3 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-32 cursor-pointer hover:opacity-90 transition-opacity">
                            <ArticleImage
                              src={article.image}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>
                      <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white mb-1 leading-tight text-justify line-clamp-2">
                        <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                          {article.title}
                        </Link>
                      </h4>
                    </article>
                  ))}
                </div>

                {/* More Articles Grid - Right Column */}
                <div className="md:col-span-1 flex flex-col gap-4">
                  {rightFeaturedArticles.map((article) => (
                    <article key={article.id} className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0">
                      <Link href={`/article/${article.slug}`}>
                          <div className="mb-3 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-32 cursor-pointer hover:opacity-90 transition-opacity">
                            <ArticleImage
                              src={article.image}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>
                      <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white mb-1 leading-tight text-justify line-clamp-2">
                        <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                          {article.title}
                        </Link>
                      </h4>
                    </article>
                  ))}

                </div>
              </div>
            ) : null}
            <div className="mt-2 text-xs font-extrabold tracking-widest" style={{ color: '#ff2000' }}>
              INKURU ZIGEZWEHO
            </div>
          </div>
        </section>

        {/* Homepage Advertisements (Top + Bottom) */}
        {(advertsLoading || homepageTopAdverts.length > 0 || homepageBottomAdverts.length > 0) && (
          <section className="py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="lg:hidden">
                {homepageTopAdverts.length > 0 ? (
                  homepageTopAdverts.slice(0, 1).map((advert: any) => (
                    <a
                      key={`top-mobile-${advert.id}`}
                      href={advert.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full group hover:opacity-90 transition-opacity"
                    >
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  ))
                ) : advertsLoading ? (
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] border border-neutral-200 dark:border-neutral-700 animate-pulse" />
                ) : null}
              </div>

              <div className="hidden lg:grid lg:grid-cols-2 gap-4">
                {homepageTopAdverts.length > 0 ? (
                  homepageTopAdverts.slice(0, 1).map((advert: any) => (
                    <a
                      key={`top-desktop-${advert.id}`}
                      href={advert.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full group hover:opacity-90 transition-opacity"
                    >
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  ))
                ) : advertsLoading ? (
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] border border-neutral-200 dark:border-neutral-700 animate-pulse" />
                ) : null}

                {homepageBottomAdverts.length > 0 ? (
                  homepageBottomAdverts.slice(0, 1).map((advert: any) => (
                    <a
                      key={`bottom-desktop-${advert.id}`}
                      href={advert.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full group hover:opacity-90 transition-opacity"
                    >
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  ))
                ) : advertsLoading ? (
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] border border-neutral-200 dark:border-neutral-700 animate-pulse" />
                ) : null}
              </div>
            </div>
          </section>
        )}

        {/* Latest Stories Section */}
        <section className="py-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {latestSkeletonItems.map((item) => (
                  <LatestCardSkeleton key={`latest-skeleton-${item}`} />
                ))}
              </div>
            ) : latestPageArticles.length > 0 ? (
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
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </Link>
                    <div className="p-3 sm:p-4 md:p-6">
                      <div className="text-red-600 dark:text-red-500 text-xs font-semibold tracking-widest mb-2 uppercase">
                        {article.category}
                      </div>
                      <h3 className="text-lg font-serif font-bold text-neutral-900 dark:text-white mb-3 line-clamp-2">
                        <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">{article.title}</Link>
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 font-light">
                        {article.excerpt}
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
                <p className="text-neutral-600 dark:text-neutral-400">Nta nkuru zirashyirwaho</p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-4 min-h-10">
              <div>
                <div className="text-xs font-extrabold tracking-widest mb-2" style={{ color: '#ff2000' }}>INKURU ZIHERUKA</div>
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
          </div>
        </section>

        {/* Most Viewed Articles Section - IZAKUNZWE CYANE */}
        <section className="py-8 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {mostViewedSkeletonItems.map((item) => (
                  <MostViewedCardSkeleton key={`most-viewed-skeleton-${item}`} />
                ))}
              </div>
            ) : mostViewedPageArticles.length > 0 ? (
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
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </Link>
                    <div className="p-5">
                      <div className="text-red-600 dark:text-red-500 text-xs font-semibold tracking-widest mb-2 uppercase">
                        {article.category}
                      </div>
                      <h3 className="text-base font-serif font-bold text-neutral-900 dark:text-white mb-2 line-clamp-2">
                        <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">{article.title}</Link>
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                        {article.excerpt}
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

            <div className="mt-4 flex items-center justify-between gap-4 min-h-10">
              <div>
                <div className="text-xs font-extrabold tracking-widest mb-2" style={{ color: '#ff2000' }}>IZIKUNZWE CYANE</div>
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

            {(youtubeLoading || youtubeVideos.length > 0) && (
              <div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-6">
                <div className="text-xs font-extrabold tracking-widest mb-4" style={{ color: '#ff2000' }}>
                  AMASHUSHO AHERUKA
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
                ) : (
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
                              const img = event.currentTarget;
                              if (video.thumbnailFallback && img.src !== video.thumbnailFallback) {
                                img.src = video.thumbnailFallback;
                              }
                            }}
                          />
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
                )}
              </div>
            )}
          </div>
        </section>

        {/* Homepage Bottom Advertisement (Mobile/Tablet) */}
        {(advertsLoading || homepageBottomAdverts.length > 0) && (
          <section className="lg:hidden py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {homepageBottomAdverts.length > 0 ? (
                homepageBottomAdverts.slice(0, 1).map((advert: any) => (
                  <a
                    key={`bottom-mobile-${advert.id}`}
                    href={advert.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full group hover:opacity-90 transition-opacity"
                  >
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                      <img
                        src={advert.imageUrl}
                        alt={advert.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </a>
                ))
              ) : advertsLoading ? (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] border border-neutral-200 dark:border-neutral-700 animate-pulse" />
              ) : null}
            </div>
          </section>
        )}

        {/* Newsletter */}
        <section id="newsletter" className="py-10 bg-neutral-100 dark:bg-neutral-900/50 border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="text-red-600 text-xs font-semibold tracking-widest mb-3">GUMANA AMAKURU</div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-neutral-900 dark:text-white mb-3">
              Habwa amakuru yihariye kandi acukumbuye
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 font-light">
              Iyandikishe ku nkuru zacu kugira ngo ujye ubona amakuru acukumbuye n’ubusesenguzi bwihariye, amakuru agezweho yo muri Afurika y'Iburasirazuba.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="Imeli yawe"
                className="flex-1 px-4 py-3 rounded-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none text-sm"
                required
              />
              <button className="px-6 py-3 text-white font-medium rounded-sm transition-colors text-sm" style={{ backgroundColor: '#e2001a' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b50015'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e2001a'}>
                Emeza
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
