import { headers } from 'next/headers';

export type HomepageArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image: string | null;
  category: string;
  author: string;
  publishedAt?: string;
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

type ArticlesResponse = {
  success?: boolean;
  data?: HomepageArticle[];
};

type AdvertsResponse = {
  success?: boolean;
  data?: HomepageAdvert[];
};

function getBaseUrl(requestHeaders: Headers) {
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = forwardedHost || requestHeaders.get('host') || 'localhost:3000';
  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const protocol = forwardedProto || (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${protocol}://${host}`;
}

async function fetchHomepageArticles(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/articles?limit=24&summary=true`, {
      next: { revalidate: 60, tags: ['articles'] },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as ArticlesResponse;
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

async function fetchHomepageAdverts(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/api/adverts`, {
      next: { revalidate: 300, tags: ['adverts'] },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as AdvertsResponse;
    return Array.isArray(payload.data) ? payload.data : [];
  } catch {
    return [];
  }
}

export async function getHomepageData() {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);
  const [articles, adverts] = await Promise.all([
    fetchHomepageArticles(baseUrl),
    fetchHomepageAdverts(baseUrl),
  ]);

  return { articles, adverts };
}