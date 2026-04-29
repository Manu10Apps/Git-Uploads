import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { resolveArticleImage } from '@/lib/article-images';
import { promises as fs } from 'fs';
import path from 'path';

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
    } catch (error) {
      // Fallback to JSON file if database is unavailable
      try {
        const filePath = path.join(process.cwd(), 'data', 'articles.json');
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as { articles: any[] };
        
        if (!parsed.articles || !Array.isArray(parsed.articles)) {
          return [];
        }
        
        return parsed.articles
          .filter((a: any) => a.status === 'published')
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            image: a.image || '',
            category: a.category,
            author: a.author,
            publishedAt: new Date(a.publishedAt).toLocaleDateString(),
            publishedAtRaw: a.publishedAt,
            readTime: a.readTime || 5,
            featured: a.featured || false,
            views: 0,
          }));
      } catch {
        return [];
      }
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
    } catch (error) {
      // Fallback to JSON file if database is unavailable
      try {
        const filePath = path.join(process.cwd(), 'data', 'articles.json');
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as { articles: any[] };
        
        if (!parsed.articles || !Array.isArray(parsed.articles)) {
          return [];
        }
        
        return parsed.articles
          .filter((a: any) => a.status === 'published')
          .slice(0, 5)
          .map((a: any) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            image: a.image || '',
            category: a.category,
            author: a.author,
            publishedAt: new Date(a.publishedAt).toLocaleDateString(),
            publishedAtRaw: a.publishedAt,
            readTime: a.readTime || 5,
            featured: a.featured || false,
            views: 0,
          }));
      } catch {
        return [];
      }
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

const getSportsArticles = unstable_cache(
  async (limit: number = 3): Promise<{ title: string; image: string | null; slug: string }[]> => {
    try {
      const now = new Date();
      const articles = await prisma.article.findMany({
        where: {
          status: 'published',
          publishedAt: { lte: now },
          category: { slug: 'siporo' },
        },
        select: {
          title: true,
          slug: true,
          image: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      });
      return articles.map((a) => ({
        title: a.title,
        slug: a.slug,
        image: resolveArticleImage(a.image, ''),
      }));
    } catch {
      return [];
    }
  },
  ['sports-articles'],
  { revalidate: 10, tags: ['articles'] },
);

export async function getLatestSportsArticles(limit: number = 3) {
  return getSportsArticles(limit);
}

export async function getLatestSportsArticlesSidebar() {
  return getSportsArticles(1);
}