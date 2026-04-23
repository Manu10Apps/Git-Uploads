import { Header, Footer, BreakingNewsCarousel } from './components';
import { DeferredHomePageFeed } from '@/app/components/DeferredHomePageFeed';
import SportsArticlesRow from '@/app/components/SportsArticlesRow';
import { HomepageHero } from '@/app/components/HomepageHero';
import { NewsletterSignup } from '@/app/components/NewsletterSignup';
import { getFeaturedHomepageData, getHomepageData } from '@/lib/homepage-data';
import { HomepageAdverts } from '@/app/components/HomepageAdverts';

export default async function Home() {
  // Load featured data only for initial render (fast)
  const { articles: featuredPageArticles, adverts } = await getFeaturedHomepageData();

  const featuredArticle = featuredPageArticles.find((article) => article.featured) || featuredPageArticles[0] || null;
  const featuredRemainingArticles = featuredPageArticles.filter((article) => featuredArticle && article.id !== featuredArticle.id);
  const secondaryFeaturedArticles = featuredRemainingArticles.slice(0, 2);
  const rightFeaturedArticles = featuredRemainingArticles.slice(2, 4);

  const homepageTopAdverts = adverts.filter((advert) => advert.position === 'homepage_top' && advert.isActive);
  const homepageBottomAdverts = adverts.filter((advert) => advert.position === 'homepage_bottom' && advert.isActive);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="hidden md:block">
          <BreakingNewsCarousel articles={featuredPageArticles.slice(0, 5)} />
        </div>

        {featuredArticle && featuredPageArticles.length > 0 && (
          <HomepageHero
            featuredArticle={featuredArticle}
            secondaryFeaturedArticles={secondaryFeaturedArticles}
            rightFeaturedArticles={rightFeaturedArticles}
          />
        )}

        <HomepageAdverts topAdverts={homepageTopAdverts} bottomAdverts={homepageBottomAdverts} />

        <SportsArticlesRow />

        {/* Deferred loading for full feed */}
        <DeferredHomePageFeed />

        <HomepageAdverts topAdverts={homepageTopAdverts} bottomAdverts={homepageBottomAdverts} section="bottom" />

        <NewsletterSignup />
      </main>
      <Footer />
    </>
  );
}