'use client';

import { useEffect, useState } from 'react';
import type { HomepageArticle } from '@/lib/homepage-data';
import { HomePageFeed } from '@/app/components/HomePageFeed';

type DeferredHomePageFeedProps = {
  articles?: HomepageArticle[];
  mostViewed?: HomepageArticle[];
};

export function DeferredHomePageFeed({ articles = [], mostViewed = [] }: DeferredHomePageFeedProps) {
  const [loadedArticles, setLoadedArticles] = useState<HomepageArticle[]>(articles);
  const [loadedMostViewed, setLoadedMostViewed] = useState<HomepageArticle[]>(mostViewed);
  const [loading, setLoading] = useState(articles.length === 0);

  useEffect(() => {
    if (articles.length > 0 && mostViewed.length > 0) {
      // Data already provided from server
      return;
    }

    // Load articles on client side
    async function fetchData(retries = 3) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch('/api/articles', {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const allArticles = data.data || [];
        setLoadedArticles(allArticles);
        setLoadedMostViewed(
          [...allArticles].sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('Failed to load articles:', errorMsg);

        // Retry on network errors
        if (retries > 0 && (errorMsg.includes('Failed to fetch') || errorMsg.includes('AbortError'))) {
          console.log(`Retrying... (${retries} attempts remaining)`);
          setTimeout(() => fetchData(retries - 1), 1000);
          return;
        }

        // If all retries exhausted, stop loading but don't crash
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [articles, mostViewed]);

  if (loading) {
    return <div className="py-12 text-center text-neutral-500">Loading articles...</div>;
  }

  return <HomePageFeed articles={loadedArticles} mostViewed={loadedMostViewed} />;
}
