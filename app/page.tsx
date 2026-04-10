import { Header, Footer, BreakingNewsCarousel } from './components';
import { DeferredHomePageFeed } from '@/app/components/DeferredHomePageFeed';
import { HomepageHero } from '@/app/components/HomepageHero';
import { NewsletterSignup } from '@/app/components/NewsletterSignup';
import { getHomepageData } from '@/lib/homepage-data';

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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="hidden md:block">
          <BreakingNewsCarousel articles={articles.slice(0, 5)} />
        </div>

        {featuredArticle && featuredPageArticles.length > 0 && (
          <HomepageHero
            featuredArticle={featuredArticle}
            secondaryFeaturedArticles={secondaryFeaturedArticles}
            rightFeaturedArticles={rightFeaturedArticles}
          />
        )}

        <section className="py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 text-center">Kwamamaza</p>
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
              ) : (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-400 dark:text-neutral-500 text-sm">Ad Space</span>
                </div>
              )}
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
              ) : (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-400 dark:text-neutral-500 text-sm">Ad Space</span>
                </div>
              )}

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
              ) : (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-400 dark:text-neutral-500 text-sm">Ad Space</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <DeferredHomePageFeed articles={articles} mostViewed={mostViewed} />

        <section className="lg:hidden py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 text-center">Kwamamaza</p>
            {homepageBottomAdverts.length > 0 ? (
              homepageBottomAdverts.slice(0, 1).map((advert) => (
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
              ))
            ) : (
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-[728/90] flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-400 dark:text-neutral-500 text-sm">Ad Space</span>
              </div>
            )}
          </div>
        </section>

        <NewsletterSignup />
      </main>
      <Footer />
    </>
  );
}