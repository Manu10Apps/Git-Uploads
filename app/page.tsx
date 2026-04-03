import Link from 'next/link';
import { Header, Footer, BreakingNewsCarousel } from './components';
import { ArticleImage } from '@/app/components/ArticleImage';
import { DeferredHomePageFeed } from '@/app/components/DeferredHomePageFeed';
import { NewsletterSignup } from '@/app/components/NewsletterSignup';
import { getHomepageData } from '@/lib/homepage-data';
import { formatCategoryLabel, formatKinyarwandaDateTime } from '@/lib/utils';

export default async function Home() {
  const { articles, adverts } = await getHomepageData();

  const featuredPageArticles = articles.slice(0, 5);
  const featuredArticle = featuredPageArticles.find((article) => article.featured) || featuredPageArticles[0] || null;
  const featuredRemainingArticles = featuredPageArticles.filter((article) => featuredArticle && article.id !== featuredArticle.id);
  const secondaryFeaturedArticles = featuredRemainingArticles.slice(0, 2);
  const rightFeaturedArticles = featuredRemainingArticles.slice(2, 4);
  const mostViewed = [...articles].sort((left, right) => (right.views || 0) - (left.views || 0));
  const homepageTopAdverts = adverts.filter((advert) => advert.position === 'homepage_top' && advert.isActive);
  const homepageBottomAdverts = adverts.filter((advert) => advert.position === 'homepage_bottom' && advert.isActive);
  const featuredDateTime = formatKinyarwandaDateTime(featuredArticle?.publishedAtRaw || featuredArticle?.publishedAt || null);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="hidden md:block">
          <BreakingNewsCarousel articles={articles.slice(0, 5)} />
        </div>

        <section className="py-6 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {featuredArticle && featuredPageArticles.length > 0 ? (
              <div className="relative grid grid-cols-1 gap-6 pt-10 md:grid-cols-4">
                <div className="absolute right-0 top-0 z-10">
                  <div className="imv-header-nav shrink-0">
                    <div className="imv-header-nav-title">
                      INKURU ZIGEZWEHO
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
                          alt={featuredArticle.title}
                          loading="eager"
                          fetchPriority="high"
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
                      <div className="mt-2">
                        <div className="grid grid-cols-3 items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                          <span className="truncate pr-2">{formatCategoryLabel(featuredArticle.category)}</span>
                          <span className="text-center whitespace-nowrap">{featuredDateTime.dateLabel}</span>
                          <span className="text-right whitespace-nowrap">{featuredDateTime.timeLabel}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>

                <div className="md:col-span-1 flex flex-col gap-4">
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

          </div>
        </section>

        {(homepageTopAdverts.length > 0 || homepageBottomAdverts.length > 0) && (
          <section className="py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="lg:hidden">
                {homepageTopAdverts.length > 0 ? (
                  homepageTopAdverts.slice(0, 1).map((advert) => (
                    <a
                      key={`top-mobile-${advert.id}`}
                      href={advert.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full group hover:opacity-90 transition-opacity"
                    >
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  ))
                ) : null}
              </div>

              <div className="hidden lg:grid lg:grid-cols-2 gap-4">
                {homepageTopAdverts.length > 0 ? (
                  homepageTopAdverts.slice(0, 1).map((advert) => (
                    <a
                      key={`top-desktop-${advert.id}`}
                      href={advert.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full group hover:opacity-90 transition-opacity"
                    >
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  ))
                ) : null}

                {homepageBottomAdverts.length > 0 ? (
                  homepageBottomAdverts.slice(0, 1).map((advert) => (
                    <a
                      key={`bottom-desktop-${advert.id}`}
                      href={advert.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full group hover:opacity-90 transition-opacity"
                    >
                      <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                        <img
                          src={advert.imageUrl}
                          alt={advert.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </a>
                  ))
                ) : null}
              </div>
            </div>
          </section>
        )}

        <DeferredHomePageFeed articles={articles} mostViewed={mostViewed} />

        {homepageBottomAdverts.length > 0 && (
          <section className="lg:hidden py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {homepageBottomAdverts.slice(0, 1).map((advert) => (
                <a
                  key={`bottom-mobile-${advert.id}`}
                  href={advert.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full group hover:opacity-90 transition-opacity"
                >
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
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

        <NewsletterSignup />
      </main>
      <Footer />
    </>
  );
}