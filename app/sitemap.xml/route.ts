'use server';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intambwemedia.com';
  
  try {
    // Fetch articles for the sitemap with timeout using Prisma model query.
    let articles: Array<{ slug: string; publishedAt: Date | null }> = [];

    try {
      const result = await Promise.race<Array<{ slug: string; publishedAt: Date | null }>>([
        prisma.article.findMany({
          where: { status: 'published' },
          select: { slug: true, publishedAt: true },
          orderBy: { publishedAt: 'desc' },
          take: 5000,
        }),
        new Promise<Array<{ slug: string; publishedAt: Date | null }>>((_, reject) =>
          setTimeout(() => reject(new Error('Sitemap query timeout')), 20000)
        ),
      ]);
      articles = result;
    } catch (queryError) {
      console.warn('Failed to fetch articles for sitemap:', queryError);
      // Continue with empty articles array - fallback sitemap will be used
      articles = [];
    }

    const sitemapUrls = [
      {
        url: baseUrl,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0',
      },
      {
        url: `${baseUrl}/breaking`,
        lastmod: new Date().toISOString(),
        changefreq: 'hourly',
        priority: '0.9',
      },
      {
        url: `${baseUrl}/search`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.7',
      },
      {
        url: `${baseUrl}/investigations`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '0.8',
      },
      {
        url: `${baseUrl}/privacy`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.5',
      },
      {
        url: `${baseUrl}/terms`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.5',
      },
      {
        url: `${baseUrl}/ethics`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.5',
      },
      // Add article URLs
      ...articles.map((article: any) => ({
        url: `${baseUrl}/article/${article.slug}`,
        lastmod: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
        changefreq: 'monthly' as const,
        priority: '0.7',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">
  ${sitemapUrls
    .map(
      (item) => `
  <url>
    <loc>${item.url}</loc>
    <lastmod>${item.lastmod}</lastmod>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>
`
    )
    .join('')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    // Return a minimal sitemap with just the main pages if database query fails
    const minimalXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${process.env.NEXT_PUBLIC_BASE_URL || 'https://amakuru.news'}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${process.env.NEXT_PUBLIC_BASE_URL || 'https://amakuru.news'}/breaking</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
    return new NextResponse(minimalXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
}
