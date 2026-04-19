'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { ArticleImage } from '@/app/components/ArticleImage';
import { Share2, Bookmark, Clock, User } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  featured?: boolean;
  slug: string;
}

interface GridNewsLayoutProps {
  articles: NewsArticle[];
}

export function GridNewsLayout({ articles }: GridNewsLayoutProps) {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [isSaved, setIsSaved] = React.useState<Record<string, boolean>>({});

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

  const getCategoryLabel = (category: string) => {
    const slug = category.trim().toLowerCase();
    const navKey = slugToNavKey[slug];
    if (navKey && (t.nav as Record<string, string>)[navKey]) {
      return (t.nav as Record<string, string>)[navKey];
    }
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      amakuru: 'bg-red-600',
      politiki: 'bg-red-600',
      ubuzima: 'bg-cyan-600',
      uburezi: 'bg-indigo-600',
      ubukungu: 'bg-blue-600',
      ikoranabuhanga: 'bg-purple-600',
      ubushakashatsi: 'bg-orange-600',
      imyidagaduro: 'bg-green-600',
      iyobokamana: 'bg-yellow-600',
    };
    return colors[category.toLowerCase()] || 'bg-gray-600';
  };

  const handleShare = (article: NewsArticle) => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: `/article/${article.slug}`,
      }).catch(() => {});
    } else {
      const url = `${window.location.origin}/article/${article.slug}`;
      navigator.clipboard.writeText(url);
    }
  };

  if (articles.length === 0) return null;

  const featuredArticle = articles.find(a => a.featured) || articles[0];
  const secondaryArticle = articles[1];
  const sidebarArticles = articles.slice(2, 5);
  const gridArticles = articles.slice(5);

  return (
    <main className="container__main w-full bg-white dark:bg-neutral-900">
      {/* Main Container */}
      <div className="container__inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Featured News Container */}
        <div className="featured-news-container mb-8 md:mb-12" id="featured-news-container" role="region" aria-label="Featured Content">
          <span className="sr-only">Featured Content</span>
          
          {/* Three Column Layout - Stories Container */}
          <div className="three-col-layout__inner">
            <div className="three-col-layout__stories">
              
              {/* FEATURED ARTICLE - Full Width */}
              <article 
                className="article-card article-card__featured article-card--type-featured u-clickable-card article-card--with-image group relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 h-96 md:h-[500px] bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
              >
                <Link href={`/article/${featuredArticle.slug}`} className="u-clickable-card__link block w-full h-full">
                  <div className="article-card__image-wrap article-card__featured-image relative w-full h-full" tabIndex={-1} aria-hidden="true">
                    <div className="responsive-image w-full h-full">
                      <ArticleImage
                        src={featuredArticle.image}
                        alt={featuredArticle.title}
                        className="article-card__image w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="eager"
                        fetchPriority="high"
                      />
                    </div>
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                  {/* Breaking Badge */}
                  <div className="absolute top-4 md:top-6 left-4 md:left-6 z-10">
                    <div className={`post-label post-label--live flex items-center gap-2 text-white px-3 py-1 rounded-full text-sm font-bold ${getCategoryColor(featuredArticle.category)}`}>
                      <svg className="icon icon--blinking-dot w-2 h-2" viewBox="0 0 16 16" aria-hidden="true">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1" fill="white"></circle>
                        <circle cx="8" cy="8" r="3" fill="currentColor">
                          <animate attributeName="opacity" values="1;1;1;1;0;1" dur="2.5s" repeatCount="indefinite"></animate>
                        </circle>
                      </svg>
                      <span className="post-label__text">{t.home?.breakingNews || 'BREAKING'}</span>
                    </div>
                  </div>

                  {/* Featured Content */}
                  <div className="article-card__featured-content absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                    <div className="article-card__label mb-3 md:mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${getCategoryColor(featuredArticle.category)}`}>
                        {getCategoryLabel(featuredArticle.category)}
                      </span>
                    </div>
                    
                    <h2 className="article-card__title text-2xl md:text-4xl font-bold mb-2 md:mb-3 leading-tight line-clamp-3">
                      {featuredArticle.title}
                    </h2>
                    
                    <p className="article-card__excerpt text-sm md:text-base text-gray-100 line-clamp-2">
                      {featuredArticle.excerpt}
                    </p>

                    {/* Metadata */}
                    <div className="article-card__meta mt-3 md:mt-4 flex items-center gap-4 text-xs md:text-sm text-gray-200 border-t border-white/20 pt-3 md:pt-4">
                      <span className="article-meta__author flex items-center gap-1">
                        <User size={14} /> {featuredArticle.author}
                      </span>
                    </div>
                  </div>
                </Link>
              </article>

              {/* SECONDARY & SIDEBAR SECTION */}
              {secondaryArticle && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-8 md:mt-12">
                  
                  {/* Secondary Large Article */}
                  <article className="md:col-span-2 article-card article-card--large article-card--type-post u-clickable-card article-card--with-image group cursor-pointer">
                    <div className="article-card__content-wrap">
                      <Link href={`/article/${secondaryArticle.slug}`} className="u-clickable-card__link block">
                        <div className="article-card__image-wrap article-card__featured-image relative overflow-hidden rounded-lg h-72 md:h-80 shadow-md hover:shadow-lg transition-all duration-300 bg-neutral-100 dark:bg-neutral-800 group mb-4" tabIndex={-1} aria-hidden="true">
                          <div className="responsive-image w-full h-full">
                            <ArticleImage
                              src={secondaryArticle.image}
                              alt={secondaryArticle.title}
                              className="article-card__image w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute top-3 left-3">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${getCategoryColor(secondaryArticle.category)}`}>
                              {getCategoryLabel(secondaryArticle.category)}
                            </span>
                          </div>
                        </div>

                        <div className="article-card__text-content">
                          <h3 className="article-card__title text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {secondaryArticle.title}
                          </h3>
                          <p className="article-card__excerpt text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {secondaryArticle.excerpt}
                          </p>
                          <footer className="article-card__footer flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                            <span>{secondaryArticle.author}</span>
                            <span>{secondaryArticle.publishedAt}</span>
                          </footer>
                        </div>
                      </Link>
                    </div>
                  </article>

                  {/* Sidebar Small Articles */}
                  <div className="hp-featured-second-stories">
                    <ul className="flex flex-col gap-4">
                      {sidebarArticles.map((article, index) => (
                        <li key={article.id} className="hp-featured-second-stories__item">
                          <Link href={`/article/${article.slug}`}>
                            <article className="article-card article-card--small article-card--type-post u-clickable-card article-card--with-image group h-full cursor-pointer">
                              <div className="article-card__content-wrap article-card__content-wrap--end-image">
                                <h4 className="article-card__title text-base md:text-lg font-bold text-gray-900 dark:text-white line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {article.title}
                                </h4>
                              </div>
                              <div className="article-card__image-wrap article-card__featured-image hidden sm:block relative overflow-hidden rounded h-24 mt-2 bg-neutral-100 dark:bg-neutral-800" tabIndex={-1} aria-hidden="true">
                                <div className="responsive-image w-full h-full">
                                    <ArticleImage
                                    src={article.image}
                                    alt={article.title}
                                    className="article-card__image w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    loading="lazy"
                                  />
                                </div>
                              </div>
                            </article>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN NEWS GRID SECTION */}
        {gridArticles.length > 0 && (
          <div className="news-grid-section border-t border-gray-200 dark:border-gray-700 pt-8 md:pt-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-900 dark:text-white">
              {t.home?.latestNews || 'Latest News'}
            </h2>

            <div className="category-collection-wrapper">
              <ul className="category-collection-items category-collection-items-article grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {gridArticles.map((article) => (
                  <li key={article.id} className="article-list-item">
                    <article className="article-card article-card--medium article-card--type-post u-clickable-card article-card--with-image group bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col overflow-hidden cursor-pointer">
                      
                      <Link href={`/article/${article.slug}`} className="u-clickable-card__link flex flex-col flex-1">
                        {/* Article Image */}
                        <div className="article-card__image-wrap article-card__featured-image relative overflow-hidden h-48 bg-neutral-100 dark:bg-neutral-700 group" tabIndex={-1} aria-hidden="true">
                          <div className="responsive-image w-full h-full">
                            <ArticleImage
                              src={article.image}
                              alt={article.title}
                              className="article-card__image w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                          
                          {/* Category Badge */}
                          <div className="absolute top-3 left-3">
                            <span className={`inline-block px-3 py-1 rounded text-xs font-bold text-white ${getCategoryColor(article.category)}`}>
                              {getCategoryLabel(article.category)}
                            </span>
                          </div>
                        </div>

                        {/* Article Content */}
                        <div className="flex flex-col flex-1 p-4 md:p-5">
                          <h3 className="article-card__title text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {article.title}
                          </h3>
                          
                          <p className="article-card__excerpt text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                            {article.excerpt}
                          </p>
                        </div>

                        {/* Article Footer - Metadata */}
                        <footer className="article-card__footer px-4 md:px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                          <span className="article-meta__author">{article.author}</span>
                        </footer>
                      </Link>

                      {/* Action Buttons */}
                      <div className="article-card__actions px-4 md:px-5 pb-4 flex gap-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setIsSaved({...isSaved, [article.id]: !isSaved[article.id]})}
                          className="flex-1 flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs md:text-sm font-medium py-2 transition-colors"
                          title="Save article"
                        >
                          <Bookmark size={16} className={isSaved[article.id] ? 'fill-current' : ''} />
                          <span className="hidden sm:inline">{isSaved[article.id] ? 'Saved' : 'Save'}</span>
                        </button>
                        <button
                          onClick={() => handleShare(article)}
                          className="flex-1 flex items-center justify-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs md:text-sm font-medium py-2 transition-colors"
                          title="Share article"
                        >
                          <Share2 size={16} />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

