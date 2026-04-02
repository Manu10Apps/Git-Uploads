import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';

const SITE_URL = 'https://intambwemedia.com';

export async function GET(request: NextRequest) {
  const adminEmail = request.headers.get('x-admin-email')?.trim().toLowerCase();
  const envAdmin = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

  if (!adminEmail || (envAdmin && adminEmail !== envAdmin)) {
    const dbAdmin = adminEmail
      ? await prisma.adminUser.findUnique({
          where: { email: adminEmail },
          select: { role: true },
        })
      : null;
    if (!dbAdmin || !['admin', 'sub-admin'].includes((dbAdmin.role || '').toLowerCase().replace('_', '-'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);

    const articles = await prisma.article.findMany({
      select: {
        slug: true,
        title: true,
        image: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    const diagnostics = articles.map((article) => {
      const normalized = normalizeArticleImageUrl(article.image);
      let absoluteUrl = '';

      if (normalized) {
        if (/^https?:\/\//i.test(normalized)) {
          absoluteUrl = normalized;
        } else {
          absoluteUrl = `${SITE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
        }
      }

      return {
        slug: article.slug,
        title: article.title,
        rawImage: article.image,
        normalizedImage: normalized,
        absoluteUrl: absoluteUrl || '(none)',
        isAccessible: absoluteUrl ? 'pending' : '(no url)',
      };
    });

    // Attempt to verify URL accessibility
    const withAccessibility = await Promise.all(
      diagnostics.map(async (item) => {
        if (!item.absoluteUrl || item.absoluteUrl === '(none)') {
          return item;
        }

        try {
          const res = await fetch(item.absoluteUrl, { method: 'HEAD', redirect: 'follow' });
          return {
            ...item,
            isAccessible: res.ok ? `✓ ${res.status}` : `✗ ${res.status}`,
          };
        } catch (error) {
          return {
            ...item,
            isAccessible: `✗ ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      count: articles.length,
      diagnostics: withAccessibility,
      siteUrl: SITE_URL,
    });
  } catch (error) {
    console.error('OG image diagnostic error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Diagnostic failed',
      },
      { status: 500 }
    );
  }
}
