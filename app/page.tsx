import { Header, Footer, BreakingNewsCarousel } from './components';
import { DeferredHomePageFeed } from '@/app/components/DeferredHomePageFeed';
import { HomepageHero } from '@/app/components/HomepageHero';
import { NewsletterSignup } from '@/app/components/NewsletterSignup';
import { getHomepageData } from '@/lib/homepage-data';
import { HomepageAdverts } from '@/app/components/HomepageAdverts';

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

        <HomepageAdverts topAdverts={homepageTopAdverts} bottomAdverts={homepageBottomAdverts} />

        <DeferredHomePageFeed articles={articles} mostViewed={mostViewed} />

        <HomepageAdverts topAdverts={homepageTopAdverts} bottomAdverts={homepageBottomAdverts} section="bottom" />

        <NewsletterSignup />
      </main>
      <Footer />
    </>
  );
}