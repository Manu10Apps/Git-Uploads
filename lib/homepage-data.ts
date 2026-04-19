import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { resolveArticleImage } from '@/lib/article-images';

export type HomepageArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image: string | null;
  category: string;
  author: string;
  publishedAt?: string;
  publishedAtRaw?: string;
  readTime: number;
  featured: boolean;
  views: number;
};

export type HomepageAdvert = {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  position: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const getHomepageArticles = unstable_cache(
  async (): Promise<HomepageArticle[]> => {
    try {
      const now = new Date();
      const articles = await prisma.article.findMany({
        where: {
          status: 'published',
          publishedAt: { lte: now },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          image: true,
          author: true,
          publishedAt: true,
          readTime: true,
          featured: true,
          category: { select: { slug: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 24,
      });
      return articles.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        image: resolveArticleImage(a.image, ''),
        category: a.category.slug,
        author: a.author,
        publishedAt: a.publishedAt?.toLocaleDateString(),
        publishedAtRaw: a.publishedAt?.toISOString(),
        readTime: a.readTime,
        featured: a.featured,
        views: 0,
      }));
    } catch {
      return [];
    }
  },
  ['homepage-articles'],
  { revalidate: 10, tags: ['articles'] }, // Reduced from 60s to 10s for faster updates
);

const getFeaturedArticles = unstable_cache(
  async (): Promise<HomepageArticle[]> => {
    try {
      const now = new Date();
      const articles = await prisma.article.findMany({
        where: {
          status: 'published',
          publishedAt: { lte: now },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          image: true,
          author: true,
          publishedAt: true,
          readTime: true,
          featured: true,
          category: { select: { slug: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 5, // Only load featured articles for initial render
      });
      return articles.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        image: resolveArticleImage(a.image, ''),
        category: a.category.slug,
        author: a.author,
        publishedAt: a.publishedAt?.toLocaleDateString(),
        publishedAtRaw: a.publishedAt?.toISOString(),
        readTime: a.readTime,
        featured: a.featured,
        views: 0,
      }));
    } catch {
      return [];
    }
  },
  ['homepage-featured-articles'],
  { revalidate: 10, tags: ['articles'] },
);

const getHomepageAdverts = unstable_cache(
  async (): Promise<HomepageAdvert[]> => {
    try {
      const db = prisma as any;
      const adverts = await db.advert.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      return adverts.map((a: any) => ({
        id: String(a.id),
        title: a.title,
        url: a.url || '',
        imageUrl: a.imageUrl,
        position: a.position,
        isActive: a.isActive,
        createdAt: new Date(a.createdAt).toISOString(),
        updatedAt: new Date(a.updatedAt).toISOString(),
      }));
    } catch {
      return [];
    }
  },
  ['homepage-adverts'],
  { revalidate: 60, tags: ['adverts'] },
);

export async function getHomepageData() {
  const [articles, adverts] = await Promise.all([
    getHomepageArticles(),
    getHomepageAdverts(),
  ]);
  return { articles, adverts };
}

export async function getFeaturedHomepageData() {
  const [articles, adverts] = await Promise.all([
    getFeaturedArticles(),
    getHomepageAdverts(),
  ]);
  return { articles, adverts };
}