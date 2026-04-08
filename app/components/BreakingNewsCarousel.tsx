'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { HomepageArticle } from '@/lib/homepage-data';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';

interface BreakingNewsCarouselProps {
  articles?: HomepageArticle[];
}

export default function BreakingNewsCarousel({ articles = [] }: BreakingNewsCarouselProps) {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [newsItems, setNewsItems] = useState<HomepageArticle[]>(articles);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [translations, setTranslations] = useState<Record<number, { title: string; excerpt: string }>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch articles from API if not provided
  useEffect(() => {
    if (articles.length === 0) {
      const fetchArticles = async () => {
        try {
          const response = await fetch('/api/articles?limit=10');
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setNewsItems(data.data);
          }
        } catch (error) {
          console.error('Failed to fetch trending news:', error);
          setNewsItems(articles);
        } finally {
          setLoading(false);
        }
      };
      fetchArticles();
    } else {
      setNewsItems(articles);
      setLoading(false);
    }
  }, [articles]);

  // Fetch translations when language changes
  useEffect(() => {
    if (language === 'ky') {
      setTranslations({});
      return;
    }
    const ids = newsItems.map((a) => a.id);
    if (ids.length === 0) return;

    let cancelled = false;
    const fetchTranslations = async () => {
      try {
        const res = await fetch(`/api/translations/batch?ids=${ids.join(',')}&lang=${language}`);
        const json = await res.json();
        if (!cancelled && json.data) setTranslations(json.data);
      } catch { /* fallback to originals */ }
    };
    fetchTranslations();
    return () => { cancelled = true; };
  }, [language, newsItems]);

  // Auto-rotate featured article every 5 seconds (was 2s — less main-thread churn)
  useEffect(() => {
    if (newsItems.length < 3) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentFeaturedIndex((prev) => (prev + 1) % 3);
    }, 5000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [newsItems.length]);

  // Check scroll position
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [newsItems]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading || newsItems.length === 0) {
    return null;
  }

  const getTitle = (article: HomepageArticle) => {
    if (language === 'ky') return article.title;
    return translations[article.id]?.title || article.title;
  };

  const featuredArticle = newsItems[currentFeaturedIndex];
  const maxFeaturedIndex = 3; // Show only 3 recent articles

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white/25 dark:bg-neutral-900/25 sticky top-0 z-40 hidden md:block">
      {/* Trending Topics Navigation */}
      <div className="max-w-7xl mx-auto px-0 sm:px-0 lg:px-0">
        <nav className="flex items-center px-4 sm:px-6 lg:px-8" aria-label="Trending topics">
          {/* Scrollable content */}
          <div
            ref={scrollContainerRef}
            className="flex-grow overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="flex gap-0">
              {/* Amakuru Agezweho header */}
              <Link
                href="/"
                className="flex-shrink-0 px-3 py-2 font-bold text-xs sm:text-sm border-b-2 border-transparent hover:text-black dark:hover:text-white transition-colors whitespace-nowrap flex items-center gap-2"
                style={{ backgroundColor: 'rgba(226, 0, 26, 0.1)', color: '#e2001a' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-green-500 drop-shadow-sm" aria-hidden="true">
                  <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
                </svg>
                {t.home.latestUpdates}
              </Link>

              {/* Featured article only */}
              <Link
                href={`/article/${featuredArticle.slug}`}
                className="flex-shrink-0 px-3 sm:px-4 py-4 text-xs sm:text-sm text-black dark:text-white font-semibold transition-colors whitespace-nowrap hover:text-neutral-700 dark:hover:text-neutral-300 line-clamp-1"
                title={getTitle(featuredArticle)}
              >
                {getTitle(featuredArticle)}
              </Link>
            </div>
          </div>

          {/* Autoplay Progress Indicator */}
          <div className="flex-shrink-0 flex items-center gap-2 px-2 sm:px-3">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hidden sm:inline">
              {currentFeaturedIndex + 1}/{maxFeaturedIndex}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: maxFeaturedIndex }).map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full transition-colors ${
                    index === currentFeaturedIndex
                      ? 'bg-red-700 dark:bg-amber-500'
                      : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                ></div>
              ))}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`flex-shrink-0 p-2 sm:p-3 ${
              canScrollRight
                ? 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                : 'text-neutral-300 dark:text-neutral-700 cursor-not-allowed'
            } transition-colors`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </nav>
      </div>

      {/* CSS to hide scrollbar */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}


