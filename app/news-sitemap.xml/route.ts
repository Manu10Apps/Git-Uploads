import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intambwemedia.com';

  try {
    // Fetch recent published articles (Google News Sitemap typically includes last 2 days)
    let articles: Array<{ slug: string; title: string; publishedAt: Date | null }> = [];

    try {
      const result = await Promise.race<
        Array<{ slug: string; title: string; publishedAt: Date | null }>
      >([
        prisma.article.findMany({
          where: {
            status: 'published',
            publishedAt: {
              gte: new Date(Date.now() - 48 * 60 * 60 * 1000), // Last 48 hours
            },
          },
          select: { slug: true, title: true, publishedAt: true },
          orderBy: { publishedAt: 'desc' },
          take: 1000,
        }),
        new Promise<Array<{ slug: string; title: string; publishedAt: Date | null }>>((_, reject) =>
          setTimeout(() => reject(new Error('News sitemap query timeout')), 20000)
        ),
      ]);
      articles = result;
    } catch (queryError) {
      console.warn('Failed to fetch articles for news sitemap:', queryError);
      articles = [];
    }

    // Build XML with Google News extensions
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
  .map(
    (article) => `
  <url>
    <loc>${baseUrl}/article/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Intambwe Media</news:name>
        <news:language>${article.slug.startsWith('/') ? 'en' : 'ky'}</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt ? new Date(article.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
      <news:keywords>East Africa, Rwanda, Kenya, Tanzania, News, Breaking News</news:keywords>
    </news:news>
  </url>`
  )
  .join('')}
</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Error generating news sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
        },
      }
    );
  }
}

/**
 * Escape special characters for XML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
