'use client';

import dynamic from 'next/dynamic';
import type { HomepageArticle } from '@/lib/homepage-data';

type DeferredHomePageFeedProps = {
  articles: HomepageArticle[];
  mostViewed: HomepageArticle[];
};

const HomePageFeed = dynamic(
  () => import('@/app/components/HomePageFeed').then((module) => module.HomePageFeed),
  { ssr: false },
);

export function DeferredHomePageFeed({ articles, mostViewed }: DeferredHomePageFeedProps) {
  return <HomePageFeed articles={articles} mostViewed={mostViewed} />;
}
