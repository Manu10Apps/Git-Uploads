'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  tags: string[];
  featured?: boolean;
}

interface BreakingNewsCarouselProps {
  articles?: Article[];
}

export default function BreakingNewsCarousel({ articles = [] }: BreakingNewsCarouselProps) {
  const [newsItems, setNewsItems] = useState<Article[]>(articles);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
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

  // Auto-rotate featured article every 2 seconds (3 recent articles only)
  useEffect(() => {
    if (newsItems.length < 3) return;

    autoPlayRef.current = setInterval(() => {
      setCurrentFeaturedIndex((prev) => (prev + 1) % 3);
    }, 2000);

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
                <Image
                  src="https://images.openai.com/static-rsc-3/qI6V75UtA0r464HNBW9eTps_4dW0gXdkmTDut-rjNqhhxXOtCfmFvlcPA3rYVGHxxpcOLvq4xFriS83tDD5WHIzfWtKrPp5q1d6jYHO28gM?purpose=fullsize&v=1"
                  alt="Trending"
                  width={18}
                  height={18}
                  className="w-4 h-4 object-contain"
                />
                Amakuru Agezweho
              </Link>

              {/* Featured article only */}
              <Link
                href={`/article/${featuredArticle.slug}`}
                className="flex-shrink-0 px-3 sm:px-4 py-4 text-xs sm:text-sm text-black dark:text-white font-semibold transition-colors whitespace-nowrap hover:text-neutral-700 dark:hover:text-neutral-300 line-clamp-1"
                title={featuredArticle.title}
              >
                {featuredArticle.title}
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


