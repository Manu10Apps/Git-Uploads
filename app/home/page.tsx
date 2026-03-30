'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { Header, Footer, GridNewsLayout, BreakingNewsCarousel } from '@/app/components';
import { ArticleImage } from '@/app/components/ArticleImage';

export default function HomePage() {
  const { language } = useAppStore();
  const t = getTranslation(language);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch('/api/articles?summary=true&limit=12');
        if (response.ok) {
          const result = await response.json();
          const data = result.data || [];
          const formattedArticles = data.map((article: any) => ({
            id: article.id,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            image: article.image,
            category: article.category,
            author: article.author,
            publishedAt: article.publishedAt || new Date().toLocaleDateString(),
            readTime: article.readTime || 5,
            tags: [],
            featured: article.featured,
          }));
          setArticles(formattedArticles);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterStatus('error');
      setNewsletterMessage('Please enter a valid email address');
      return;
    }

    setNewsletterStatus('loading');
    
    // Simulate newsletter subscription (replace with actual API call when ready)
    setTimeout(() => {
      setNewsletterStatus('success');
      setNewsletterMessage('Thank you for subscribing! Check your email for confirmation.');
      setEmail('');
      
      // Reset after 5 seconds
      setTimeout(() => {
        setNewsletterStatus('idle');
        setNewsletterMessage('');
      }, 5000);
    }, 1000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-900">
        {/* Breaking News Carousel - Hidden on mobile, shown on md and above */}
        {articles.length > 0 && (
          <div className="hidden md:block">
            <BreakingNewsCarousel articles={articles.slice(0, 5)} />
          </div>
        )}

        {/* Featured Three-Column Grid Layout */}
        {articles.length > 0 && (
          <section className="py-12 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-6 gap-6">
                {/* Main Featured Article - Spans 4 columns */}
                <div className="md:col-span-4">
                  <article className="flex flex-col h-full">
                    <div className="mb-4 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 h-48 md:h-80">
                        <ArticleImage
                          src={articles[0]?.image}
                          alt={articles[0]?.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    <div className="flex-grow">
                      <div className="text-red-700 text-xs font-semibold tracking-widest mb-2">
                        INKURU ZIGEZWEHO
                      </div>
                      <h3 className="text-xl md:text-2xl font-serif font-bold text-neutral-900 dark:text-white mb-3 leading-tight">
                        <Link href={`/article/${articles[0].slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                          {articles[0].title}
                        </Link>
                      </h3>
                      <p className="hidden md:block text-sm text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                        {articles[0].excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                        <span>{articles[0].author}</span>
                        <span>•</span>
                        <span>{articles[0].publishedAt}</span>
                      </div>
                    </div>
                  </article>
                </div>

                {/* Secondary Articles - Spans 2 columns */}
                <div className="md:col-span-2 flex flex-col gap-3 md:gap-6">
                  {articles.slice(1, 3).map((article) => (
                    <article key={article.id} className="flex flex-col rounded overflow-hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
                      <Link href={`/article/${article.slug}`}>
                          <div className="flex-shrink-0 w-full h-40 md:h-56 rounded-t overflow-hidden bg-neutral-100 dark:bg-neutral-800 cursor-pointer hover:opacity-90 transition-opacity">
                            <ArticleImage
                              src={article.image}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </Link>
                      <div className="flex-grow p-4">
                        <h4 className="text-base md:text-lg font-serif font-bold text-neutral-900 dark:text-white mb-2 leading-tight line-clamp-2">
                          <Link href={`/article/${article.slug}`} className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors">
                            {article.title}
                          </Link>
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2">
                          {article.excerpt}
                        </p>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {article.publishedAt}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Grid News Layout */}
        {articles.length > 0 && (
          <section className="py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <GridNewsLayout articles={articles} />
            </div>
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <section className="py-12 px-4 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">Inkuru ziri gushakishwa...</p>
          </section>
        )}

        {/* Newsletter Section */}
        <section id="newsletter" className="py-20 bg-neutral-100 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-3">
              Stay Updated with Latest News
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8">
              Subscribe to get the latest breaking news and investigative stories delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={newsletterStatus === 'loading'}
                className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:opacity-50"
                required
              />
              <button 
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {newsletterStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            {newsletterMessage && (
              <p className={`mt-4 text-sm ${
                newsletterStatus === 'success' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {newsletterMessage}
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

