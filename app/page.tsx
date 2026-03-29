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
  const [articles, setArticles] = useState<any[]>([]);
  const [mostViewed, setMostViewed] = useState<any[]>([]);
  const [adverts, setAdverts] = useState<any[]>([]);
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

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/articles?limit=48');
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
      }
    };

    fetchArticles();
    fetchAdverts();
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
              <div className="text-center py-8">
                <p className="text-neutral-600 dark:text-neutral-400">Inkuru ziri gushakishwa...</p>
              </div>
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
                <div className="md:col-span-1 flex flex-col gap-6">
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

        {/* Headline Advertisement Section */}
        {homepageTopAdverts.length > 0 && (
          <section className="py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {homepageTopAdverts.slice(0, 1).map((advert: any) => (
                <a
                  key={advert.id}
                  href={advert.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group hover:opacity-90 transition-opacity"
                >
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-16 md:h-20 lg:h-28 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={advert.imageUrl}
                      alt={advert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Latest Stories Section */}
        <section className="py-8 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-neutral-600 dark:text-neutral-400">Inkuru ziri gushakishwa...</p>
              </div>
            ) : latestPageArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {latestPageArticles.map((article) => (
                  <article
                    key={article.id}
                    className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-200 dark:hover:border-red-900/50 transition-all duration-300 cursor-pointer hover:shadow-lg"
                  >
                    <Link href={`/article/${article.slug}`}>
                        <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-24">
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

            <div className="mt-4 flex items-center justify-between gap-4">
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
              <div className="text-center py-8">
                <p className="text-neutral-600 dark:text-neutral-400">Inkuru ziri gushakishwa...</p>
              </div>
            ) : mostViewedPageArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
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

            <div className="mt-4 flex items-center justify-between gap-4">
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
          </div>
        </section>

        {/* Homepage Bottom Advertisement */}
        {homepageBottomAdverts.length > 0 && (
          <section className="py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {homepageBottomAdverts.slice(0, 1).map((advert: any) => (
                <a
                  key={advert.id}
                  href={advert.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group hover:opacity-90 transition-opacity"
                >
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden h-16 md:h-20 lg:h-28 flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                    <img
                      src={advert.imageUrl}
                      alt={advert.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </a>
              ))}
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
