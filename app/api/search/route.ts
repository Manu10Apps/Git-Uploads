import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query must be at least 2 characters',
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const searchTerm = query.trim();

    // Search articles by title, excerpt, or content
    const results = await prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: {
          lte: now,
        },
        OR: [
          {
            title: {
              contains: searchTerm,
            },
          },
          {
            excerpt: {
              contains: searchTerm,
            },
          },
          {
            content: {
              contains: searchTerm,
            },
          },
        ],
      },
      include: { category: true },
      orderBy: { publishedAt: 'desc' },
      take: 20,
    });

    // Format response
    const formattedResults = results.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      image: normalizeArticleImageUrl(article.image),
      category: article.category.slug,
      categoryName: article.category.name,
      author: article.author,
      publishedAt: article.publishedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: formattedResults,
        query,
        count: formattedResults.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
      },
      { status: 500 }
    );
  }
}
