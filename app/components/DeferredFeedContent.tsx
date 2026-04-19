'use client';

import { useEffect, useState } from 'react';
import { HomePageFeed } from '@/app/components/HomePageFeed';
import type { HomepageArticle } from '@/lib/homepage-data';

export function DeferredFeedContent() {
  const [articles, setArticles] = useState<HomepageArticle[]>([]);
  const [mostViewed, setMostViewed] = useState<HomepageArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/articles?limit=24');
        const data = await response.json();
        const allArticles = data.articles || [];
        setArticles(allArticles);
        setMostViewed(
          [...allArticles].sort((a, b) => (b.views || 0) - (a.views || 0))
        );
      } catch (error) {
        console.error('Failed to load articles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-neutral-500">Loading articles...</div>;
  }

  return <HomePageFeed articles={articles} mostViewed={mostViewed} />;
}
