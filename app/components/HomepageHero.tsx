'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArticleImage } from '@/app/components/ArticleImage';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { formatCategoryLabel, formatLocalizedDateTime } from '@/lib/utils';
import type { HomepageArticle } from '@/lib/homepage-data';

type TranslationMap = Record<number, { title: string; excerpt: string }>;

interface HomepageHeroProps {
  featuredArticle: HomepageArticle;
  secondaryFeaturedArticles: HomepageArticle[];
  rightFeaturedArticles: HomepageArticle[];
}

export function HomepageHero({
  featuredArticle,
  secondaryFeaturedArticles,
  rightFeaturedArticles,
}: HomepageHeroProps) {
  const language = useAppStore((s) => s.language);
  const t = getTranslation(language);
  const [translations, setTranslations] = useState<TranslationMap>({});

  const allArticles = [featuredArticle, ...secondaryFeaturedArticles, ...rightFeaturedArticles];
  const articleIds = allArticles.map((a) => a.id);

  useEffect(() => {
    if (language === 'ky') {
      setTranslations({});
      return;
    }

    const fetchTranslations = async () => {
      try {
        const res = await fetch(
          `/api/translations/batch?ids=${articleIds.join(',')}&lang=${language}`
        );
        const json = await res.json();
        if (json.data) {
          setTranslations(json.data);
        }
      } catch {
        // Fallback to original titles
      }
    };

    fetchTranslations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const getTitle = (article: HomepageArticle) => {
    if (language === 'ky') return article.title;
    return translations[article.id]?.title || article.title;
  };

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
  };

  const getCategoryLabel = (category?: string | null) => {
    if (!category) return 'GENERAL';
    const slug = category.trim().toLowerCase();
    const navKey = slugToNavKey[slug];
    if (navKey && (t.nav as Record<string, string>)[navKey]) {
      return (t.nav as Record<string, string>)[navKey].toUpperCase();
    }
    return formatCategoryLabel(category);
  };

  const featuredDateTime = formatLocalizedDateTime(
    featuredArticle.publishedAtRaw || featuredArticle.publishedAt || null,
    t
  );

  return (
    <section className="py-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative grid grid-cols-1 gap-6 pb-10 md:grid-cols-4">
          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 rotate-180 lg:left-auto lg:right-0 lg:translate-x-0">
            <div className="imv-header-nav shrink-0">
              <div className="imv-header-nav-title">
                <span className="-rotate-180 inline-block">{t.home.featured}</span>
                <span className="a1" />
                <span className="a2" />
                <span className="a3" />
                <span className="a4" />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <article className="flex flex-col h-full">
              <Link href={`/article/${featuredArticle.slug}`}>
                <div className="mb-4 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0 h-48 sm:h-64 md:h-80 lg:h-96 cursor-pointer hover:opacity-90 transition-opacity">
                  <ArticleImage
                    src={featuredArticle.image}
                    alt={getTitle(featuredArticle)}
                    loading="eager"
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
              <div className="flex-grow">
                <h3 className="text-xl font-serif font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                  <Link
                    href={`/article/${featuredArticle.slug}`}
                    className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors"
                  >
                    {getTitle(featuredArticle)}
                  </Link>
                </h3>
                <div className="mt-2 flex items-center justify-between w-full text-xs font-bold text-neutral-600 dark:text-neutral-400">
                  <span className="truncate pr-2">
                    {getCategoryLabel(featuredArticle.category)}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="whitespace-nowrap">{featuredDateTime.timeLabel}</span>
                    <span className="mx-0.5">·</span>
                    <span className="whitespace-nowrap">{featuredDateTime.dateLabel}</span>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="md:col-span-1 flex flex-col gap-4">
            {secondaryFeaturedArticles.map((article) => (
              <article
                key={article.id}
                className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
              >
                <Link href={`/article/${article.slug}`}>
                  <div className="mb-3 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-32 cursor-pointer hover:opacity-90 transition-opacity">
                    <ArticleImage
                      src={article.image}
                      alt={getTitle(article)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white mb-1 leading-tight text-justify line-clamp-2">
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors"
                  >
                    {getTitle(article)}
                  </Link>
                </h4>
              </article>
            ))}
          </div>

          <div className="md:col-span-1 flex flex-col gap-4">
            {rightFeaturedArticles.map((article) => (
              <article
                key={article.id}
                className="pb-4 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
              >
                <Link href={`/article/${article.slug}`}>
                  <div className="mb-3 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-32 cursor-pointer hover:opacity-90 transition-opacity">
                    <ArticleImage
                      src={article.image}
                      alt={getTitle(article)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>
                <h4 className="text-base font-serif font-bold text-neutral-900 dark:text-white mb-1 leading-tight text-justify line-clamp-2">
                  <Link
                    href={`/article/${article.slug}`}
                    className="text-neutral-900 dark:text-white hover:text-red-700 transition-colors"
                  >
                    {getTitle(article)}
                  </Link>
                </h4>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
