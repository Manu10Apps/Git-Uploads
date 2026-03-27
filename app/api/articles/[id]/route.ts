import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { resolveArticleImage } from '@/lib/article-images';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { NAV_CATEGORY_SLUGS } from '@/lib/nav-categories';

/** Lookup the requesting admin user's role and name from DB, if x-admin-email header present */
async function getRequesterInfo(request: NextRequest): Promise<{ role: string; name: string } | null> {
  const email = request.headers.get('x-admin-email')?.trim().toLowerCase();
  if (!email) return null;
  const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (envAdminEmail && email === envAdminEmail) {
    return { role: 'admin', name: process.env.ADMIN_NAME || 'Admin' };
  }
  try {
    const user = await prisma.adminUser.findUnique({
      where: { email },
      select: { role: true, name: true },
    });
    return user ? { role: user.role, name: user.name } : null;
  } catch {
    return null;
  }
}

interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  category: { slug: string };
  author: string;
  publishedAt?: Date;
  readTime?: number;
  featured?: boolean;
  tags?: string;
  updatedAt?: Date;
  [key: string]: any;
}

type FallbackArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string | null;
  category: string;
  author: string;
  status: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  readTime: number;
  featured: boolean;
  tags: string[];
  gallery: Array<{ url: string; caption: string }>;
  createdAt: string;
  updatedAt: string;
};

type ArticlesFallbackFile = {
  articles: FallbackArticle[];
};

function getFallbackArticlesPath() {
  return path.join(process.cwd(), 'data', 'articles.json');
}

function isDatabaseUnavailableError(error: unknown) {
  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  const errorMessage = error instanceof Error ? error.message : String(error || '');

  return (
    ['P1000', 'P1001', 'P1002', 'P1017', 'P2024', 'P2010'].includes(prismaCode) ||
    /can't reach database server|connection refused|econnrefused|connect timeout|timeout expired|database is locked|does not exist|type\s+"datetime"\s+does not exist/i.test(
      errorMessage
    )
  );
}

function resolveFallbackCategorySlug(categoryId: unknown, existingSlug: string) {
  const raw = String(categoryId || '').trim();
  if (!raw) {
    return existingSlug;
  }

  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= NAV_CATEGORY_SLUGS.length) {
    return NAV_CATEGORY_SLUGS[parsed - 1];
  }

  if (NAV_CATEGORY_SLUGS.includes(raw)) {
    return raw;
  }

  return existingSlug;
}

async function readFallbackArticles(): Promise<FallbackArticle[]> {
  try {
    const raw = await fs.readFile(getFallbackArticlesPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ArticlesFallbackFile>;
    if (!parsed || !Array.isArray(parsed.articles)) {
      return [];
    }

    return parsed.articles;
  } catch {
    return [];
  }
}

async function writeFallbackArticles(articles: FallbackArticle[]) {
  const payload: ArticlesFallbackFile = { articles };
  await fs.writeFile(getFallbackArticlesPath(), JSON.stringify(payload, null, 2));
}

function toClientArticle(article: FallbackArticle) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    image: resolveArticleImage(article.image, article.gallery ? JSON.stringify(article.gallery) : null),
    category: article.category,
    author: article.author,
    publishedAt: article.publishedAt || undefined,
    readTime: article.readTime,
    featured: article.featured,
    tags: Array.isArray(article.tags) ? article.tags : [],
    status: article.status,
    updatedAt: article.updatedAt,
  };
}

const allowFallbackStorage = process.env.NODE_ENV !== 'production' || process.env.ALLOW_FALLBACK_STORAGE === 'true';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let parsedBody: any = null;

  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    parsedBody = await request.json();
    const body = parsedBody;

    // Normalize image path for DB storage only (no existsSync – that belongs only in GET responses).
    // If body.image is absent/empty, imageToStore is null → existing DB value will be preserved.
    const imageToStore: string | null = body.image
      ? (normalizeArticleImageUrl(String(body.image)) ?? null)
      : null;

    // Find the article first
    const article = await prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Role-based restriction: editors cannot publish articles
    const requester = await getRequesterInfo(request);
    if (requester?.role === 'editor' && body.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Editors cannot publish articles. Ask an admin or sub-admin to publish.' },
        { status: 403 }
      );
    }

    // Parse tags if provided as array
    const tagsToStore = body.tags 
      ? typeof body.tags === 'string' 
        ? body.tags 
        : JSON.stringify(body.tags)
      : article.tags;

    const nextStatus = body.status || article.status;
    const nextPublishedAt =
      body.publishedAt !== undefined
        ? (body.publishedAt ? new Date(body.publishedAt) : null)
        : nextStatus === 'published'
          ? (article.publishedAt || new Date())
          : null;

    // Update the article
    const updatedArticle = await prisma.article.update({
      where: { id },
      data: {
        title: body.title || article.title,
        excerpt: body.excerpt || article.excerpt,
        content: body.content || article.content,
        // Only overwrite the stored image when a non-empty value is explicitly supplied.
        // Using nullish coalescing preserves the existing DB image when no new image is sent.
        image: imageToStore ?? article.image,
        categoryId: body.categoryId || article.categoryId,
        author: body.author || article.author,
        featured: body.featured !== undefined ? body.featured : article.featured,
        readTime: body.readTime || article.readTime,
        tags: tagsToStore,
        status: nextStatus,
        publishedAt: nextPublishedAt,
      },
      include: { category: true },
    });

    // Format response
    const formattedArticle = {
      id: updatedArticle.id,
      title: updatedArticle.title,
      slug: updatedArticle.slug,
      excerpt: updatedArticle.excerpt,
      content: updatedArticle.content,
      image: resolveArticleImage(updatedArticle.image, updatedArticle.gallery),
      category: updatedArticle.category.slug,
      author: updatedArticle.author,
      publishedAt: updatedArticle.publishedAt?.toISOString(),
      readTime: updatedArticle.readTime,
      featured: updatedArticle.featured,
      tags: updatedArticle.tags ? JSON.parse(updatedArticle.tags) : [],
      status: updatedArticle.status,
      updatedAt: updatedArticle.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        message: 'Article updated successfully',
        data: formattedArticle,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update article:', error);

    if (isDatabaseUnavailableError(error)) {
      if (!allowFallbackStorage) {
        return NextResponse.json(
          { success: false, error: 'Database unavailable. Fix PostgreSQL connection for this environment.' },
          { status: 503 }
        );
      }

      try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);
        if (isNaN(id)) {
          return NextResponse.json(
            { success: false, error: 'Invalid article ID' },
            { status: 400 }
          );
        }

        const fallbackArticles = await readFallbackArticles();
        const index = fallbackArticles.findIndex((article) => article.id === id);
        if (index === -1) {
          return NextResponse.json(
            { success: false, error: 'Article not found' },
            { status: 404 }
          );
        }

        const body = parsedBody || {};
        const current = fallbackArticles[index];
        const nextGallery = Array.isArray(body.gallery)
          ? body.gallery
              .map((item: unknown) => {
                if (!item || typeof item !== 'object') {
                  return null;
                }

                const url = String((item as { url?: unknown }).url || '').trim();
                const caption = String((item as { caption?: unknown }).caption || '').trim();
                if (!url) {
                  return null;
                }

                return { url, caption };
              })
              .filter((item: { url: string; caption: string } | null): item is { url: string; caption: string } => Boolean(item))
          : current.gallery;

        const nextTags = Array.isArray(body.tags)
          ? body.tags.map((tag: unknown) => String(tag).trim()).filter((tag: string) => Boolean(tag))
          : typeof body.tags === 'string'
            ? body.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => Boolean(tag))
            : current.tags;

        const updated: FallbackArticle = {
          ...current,
          title: body.title ? String(body.title).trim() : current.title,
          excerpt: body.excerpt ? String(body.excerpt).trim() : current.excerpt,
          content: body.content ? String(body.content).trim() : current.content,
          image: body.image
            ? (normalizeArticleImageUrl(String(body.image)) ?? current.image)
            : current.image,
          category: resolveFallbackCategorySlug(body.categoryId, current.category),
          author: body.author ? String(body.author).trim() : current.author,
          featured: body.featured !== undefined ? Boolean(body.featured) : current.featured,
          readTime: body.readTime ? Number(body.readTime) || current.readTime : current.readTime,
          tags: nextTags,
          gallery: nextGallery,
          status: body.status ? String(body.status) : current.status,
          publishedAt:
            body.publishedAt !== undefined
              ? (body.publishedAt ? new Date(body.publishedAt).toISOString() : null)
              : current.publishedAt,
          updatedAt: new Date().toISOString(),
        };

        fallbackArticles[index] = updated;
        await writeFallbackArticles(fallbackArticles);

        return NextResponse.json(
          {
            success: true,
            degraded: true,
            message: 'Article updated using fallback storage.',
            data: toClientArticle(updated),
          },
          { status: 200 }
        );
      } catch (fallbackError) {
        console.error('Fallback update failed:', fallbackError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    // Check if article exists
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Role-based restriction: editors can only delete their own articles
    const requester = await getRequesterInfo(request);
    if (requester?.role === 'editor' && article.author !== requester.name) {
      return NextResponse.json(
        { success: false, error: 'Editors can only delete their own articles' },
        { status: 403 }
      );
    }

    // Delete the article
    await prisma.article.delete({ where: { id } });

    return NextResponse.json(
      { success: true, message: 'Article deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete article:', error);

    if (isDatabaseUnavailableError(error)) {
      if (!allowFallbackStorage) {
        return NextResponse.json(
          { success: false, error: 'Database unavailable. Fix PostgreSQL connection for this environment.' },
          { status: 503 }
        );
      }

      try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);
        if (isNaN(id)) {
          return NextResponse.json(
            { success: false, error: 'Invalid article ID' },
            { status: 400 }
          );
        }

        const fallbackArticles = await readFallbackArticles();
        const existingLength = fallbackArticles.length;
        const filtered = fallbackArticles.filter((article) => article.id !== id);

        if (filtered.length === existingLength) {
          return NextResponse.json(
            { success: false, error: 'Article not found' },
            { status: 404 }
          );
        }

        await writeFallbackArticles(filtered);

        return NextResponse.json(
          {
            success: true,
            degraded: true,
            message: 'Article deleted using fallback storage.',
          },
          { status: 200 }
        );
      } catch (fallbackError) {
        console.error('Fallback delete failed:', fallbackError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid article ID' },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    // Format response
    const formattedArticle = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      image: resolveArticleImage(article.image, article.gallery),
      category: article.category.slug,
      author: article.author,
      publishedAt: article.publishedAt?.toISOString(),
      readTime: article.readTime,
      featured: article.featured,
      tags: article.tags ? JSON.parse(article.tags) : [],
      status: article.status,
      gallery: article.gallery ? JSON.parse(article.gallery) : [],
    };

    return NextResponse.json(
      { success: true, data: formattedArticle },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch article:', error);

    if (isDatabaseUnavailableError(error)) {
      if (!allowFallbackStorage) {
        return NextResponse.json(
          { success: false, error: 'Database unavailable. Fix PostgreSQL connection for this environment.' },
          { status: 503 }
        );
      }

      try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);
        if (isNaN(id)) {
          return NextResponse.json(
            { success: false, error: 'Invalid article ID' },
            { status: 400 }
          );
        }

        const fallbackArticles = await readFallbackArticles();
        const article = fallbackArticles.find((item) => item.id === id);

        if (!article) {
          return NextResponse.json(
            { success: false, error: 'Article not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { success: true, degraded: true, data: toClientArticle(article) },
          { status: 200 }
        );
      } catch (fallbackError) {
        console.error('Fallback fetch failed:', fallbackError);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
