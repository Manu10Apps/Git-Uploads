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
    async function fetchData() {
      try {
        const response = await fetch('/api/articles?limit=24');
        const data = await response.json();
        const allArticles = data.data || [];
        setLoadedArticles(allArticles);
        setLoadedMostViewed(
          [...allArticles].sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
        );
      } catch (error) {
        console.error('Failed to load articles:', error);
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
