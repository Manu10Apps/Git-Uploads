import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveArticleImage } from '@/lib/article-images';
import { NAV_CATEGORY_SLUGS } from '@/lib/nav-categories';
import {
  ensureAuthorSocialTables,
  getAuthorSocialProfile,
  isProfileLockedForActor,
  linksToPairFields,
  parseSocialLinksFromPairInput,
  upsertAuthorSocialProfile,
} from '@/lib/author-social';

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
  authorSocialPlatform?: string | null;
  authorSocialUrl?: string | null;
  authorSocialPlatform2?: string | null;
  authorSocialUrl2?: string | null;
  status: string;
  publishedAt: string | null;
  scheduledFor: string | null;
  readTime: number;
  featured: boolean;
  tags: string[];
  gallery: Array<{ url: string; caption: string }>;
  galleryColumns?: 1 | 2 | 3;
  galleryPosition?: 'middle' | 'end';
  createdAt: string;
  updatedAt: string;
};

type GalleryItem = { url: string; caption: string };
type GalleryPayload = { items: GalleryItem[]; columns: 1 | 2 | 3; position: 'middle' | 'end' };

function toGalleryColumns(value: unknown): 1 | 2 | 3 {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 3) return parsed;
  return 2;
}

function toGalleryPosition(value: unknown): 'middle' | 'end' {
  return value === 'end' ? 'end' : 'middle';
}

function normalizeGalleryItems(input: unknown): GalleryItem[] {
  const source =
    Array.isArray(input)
      ? input
      : input && typeof input === 'object' && Array.isArray((input as { items?: unknown }).items)
        ? ((input as { items: unknown[] }).items)
        : [];

  return source
    .map((item: unknown) => {
      if (!item || typeof item !== 'object') return null;
      const url = String((item as { url?: unknown }).url || '').trim();
      const caption = String((item as { caption?: unknown }).caption || '').trim();
      if (!url) return null;
      return { url, caption };
    })
    .filter((item: GalleryItem | null): item is GalleryItem => Boolean(item));
}

function parseStoredGallery(gallery: string | null | undefined): GalleryPayload {
  if (!gallery) return { items: [], columns: 2, position: 'middle' };

  try {
    const parsed = JSON.parse(gallery);
    if (Array.isArray(parsed)) {
      return { items: normalizeGalleryItems(parsed), columns: 2, position: 'middle' };
    }
    if (parsed && typeof parsed === 'object') {
      const items = normalizeGalleryItems((parsed as { items?: unknown }).items || []);
      const columns = toGalleryColumns((parsed as { columns?: unknown }).columns);
      const position = toGalleryPosition((parsed as { position?: unknown }).position);
      return { items, columns, position };
    }
  } catch {
    // Ignore malformed gallery payload and return default.
  }

  return { items: [], columns: 2, position: 'middle' };
}

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

async function ensureArticleAuthorSocialColumns() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "articles"
    ADD COLUMN IF NOT EXISTS "authorSocialPlatform" TEXT,
    ADD COLUMN IF NOT EXISTS "authorSocialUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "authorSocialPlatform2" TEXT,
    ADD COLUMN IF NOT EXISTS "authorSocialUrl2" TEXT
  `);
}

let ensureArticleAuthorSocialColumnsPromise: Promise<void> | null = null;

function ensureArticleAuthorSocialColumnsOnce() {
  if (!ensureArticleAuthorSocialColumnsPromise) {
    ensureArticleAuthorSocialColumnsPromise = ensureArticleAuthorSocialColumns().catch((error) => {
      ensureArticleAuthorSocialColumnsPromise = null;
      throw error;
    });
  }

  return ensureArticleAuthorSocialColumnsPromise;
}

function toClientArticle(article: FallbackArticle) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    image: resolveArticleImage(article.image, typeof article.gallery === 'string' ? article.gallery : JSON.stringify(article.gallery || [])),
    category: article.category,
    author: article.author,
    authorSocialPlatform: article.authorSocialPlatform || undefined,
    authorSocialUrl: article.authorSocialUrl || undefined,
    authorSocialPlatform2: article.authorSocialPlatform2 || undefined,
    authorSocialUrl2: article.authorSocialUrl2 || undefined,
    publishedAt: article.publishedAt || undefined,
    readTime: article.readTime,
    featured: article.featured,
    tags: Array.isArray(article.tags) ? article.tags : [],
    gallery: Array.isArray(article.gallery) ? article.gallery : [],
    galleryColumns: toGalleryColumns(article.galleryColumns),
    galleryPosition: toGalleryPosition(article.galleryPosition),
    status: article.status,
    updatedAt: article.updatedAt,
  };
}

const allowFallbackStorage = process.env.NODE_ENV !== 'production' || process.env.ALLOW_FALLBACK_STORAGE === 'true';

function invalidateArticleCaches(articleSlug?: string) {
  revalidateTag('articles');
  revalidatePath('/');
  if (articleSlug) {
    revalidatePath(`/article/${articleSlug}`);
  }
}

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

    const requester = await getRequesterInfo(request);
    if (!requester) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await ensureArticleAuthorSocialColumns();
    await ensureAuthorSocialTables();

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

    // Role-based restriction: editors cannot modify other authors' articles.
    if (requester?.role === 'editor' && article.author !== requester.name) {
      return NextResponse.json(
        { success: false, error: 'Editors can only edit their own articles.' },
        { status: 403 }
      );
    }

    // Role-based restriction: editors cannot publish articles
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

    const currentGallery = parseStoredGallery(article.gallery);
    const nextGalleryItems = body.gallery !== undefined
      ? normalizeGalleryItems(body.gallery)
      : currentGallery.items;
    const nextGalleryColumns = body.galleryColumns !== undefined
      ? toGalleryColumns(body.galleryColumns)
      : currentGallery.columns;
    const nextGalleryPosition = body.galleryPosition !== undefined
      ? toGalleryPosition(body.galleryPosition)
      : currentGallery.position;
    const galleryToStore =
      nextGalleryItems.length > 0
        ? JSON.stringify({
            items: nextGalleryItems,
            columns: nextGalleryColumns,
            position: nextGalleryPosition,
          })
        : null;

    const nextStatus = body.status || article.status;
    
    // CRITICAL FIX: Validate featured image when publishing
    // If trying to publish/update to published, article MUST have a featured image
    if ((nextStatus === 'published' || body.status === 'published') && !imageToStore && !article.image) {
      return NextResponse.json(
        {
          success: false,
          error: 'Featured image is required for published articles. This ensures thumbnails display correctly on social media (Facebook, Twitter, LinkedIn, WhatsApp, etc.).',
          code: 'MISSING_FEATURED_IMAGE_ON_PUBLISH',
        },
        { status: 400 }
      );
    }
    
    const nextPublishedAt =
      body.publishedAt !== undefined
        ? (body.publishedAt ? new Date(body.publishedAt) : null)
        : nextStatus === 'published'
          ? (article.publishedAt || new Date())
          : null;

    const parsedSocial = parseSocialLinksFromPairInput({
      authorSocialPlatform: body.authorSocialPlatform,
      authorSocialUrl: body.authorSocialUrl,
      authorSocialPlatform2: body.authorSocialPlatform2,
      authorSocialUrl2: body.authorSocialUrl2,
    });

    if (!parsedSocial.ok) {
      return NextResponse.json(
        { success: false, error: parsedSocial.error },
        { status: 400 }
      );
    }

    const nextAuthorName = (body.author || article.author || '').trim();
    const hasIncomingSocialFields =
      body.authorSocialPlatform !== undefined ||
      body.authorSocialUrl !== undefined ||
      body.authorSocialPlatform2 !== undefined ||
      body.authorSocialUrl2 !== undefined;

    const existingProfile = nextAuthorName ? await getAuthorSocialProfile(nextAuthorName) : null;

    if (
      hasIncomingSocialFields &&
      existingProfile &&
      isProfileLockedForActor(existingProfile, requester.role as 'admin' | 'sub-admin' | 'editor')
    ) {
      return NextResponse.json(
        { success: false, error: 'Author social profiles are locked. Request admin authorization.' },
        { status: 403 }
      );
    }

    let socialLinksToUse = existingProfile?.socialLinks || {};
    if (hasIncomingSocialFields) {
      const savedProfile = await upsertAuthorSocialProfile({
        authorName: nextAuthorName,
        links: parsedSocial.links,
        lockAfterSave: true,
      });
      socialLinksToUse = savedProfile.socialLinks;
    }
    const socialPairFields = linksToPairFields(socialLinksToUse);

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
        authorSocialPlatform:
          hasIncomingSocialFields ? socialPairFields.authorSocialPlatform : article.authorSocialPlatform,
        authorSocialUrl:
          hasIncomingSocialFields ? socialPairFields.authorSocialUrl : article.authorSocialUrl,
        authorSocialPlatform2:
          hasIncomingSocialFields ? socialPairFields.authorSocialPlatform2 : article.authorSocialPlatform2,
        authorSocialUrl2:
          hasIncomingSocialFields ? socialPairFields.authorSocialUrl2 : article.authorSocialUrl2,
        featured: body.featured !== undefined ? body.featured : article.featured,
        readTime: body.readTime || article.readTime,
        tags: tagsToStore,
        gallery: galleryToStore,
        status: nextStatus,
        publishedAt: nextPublishedAt,
      },
      include: { category: true },
    });

    // Re-queue translations when a published article's content changes
    if (updatedArticle.status === 'published' && (body.title || body.content || body.excerpt)) {
      import('@/lib/translation-cache').then(({ queueArticleTranslations, invalidateArticleCache }) => {
        invalidateArticleCache(updatedArticle.id);
        queueArticleTranslations(updatedArticle.id).catch((err: unknown) =>
          console.error(`[translation] Failed to re-queue translations for article ${updatedArticle.id}:`, err)
        );
      });
    }

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
      authorSocialPlatform: updatedArticle.authorSocialPlatform || undefined,
      authorSocialUrl: updatedArticle.authorSocialUrl || undefined,
      authorSocialPlatform2: updatedArticle.authorSocialPlatform2 || undefined,
      authorSocialUrl2: updatedArticle.authorSocialUrl2 || undefined,
      publishedAt: updatedArticle.publishedAt?.toISOString(),
      readTime: updatedArticle.readTime,
      featured: updatedArticle.featured,
      tags: updatedArticle.tags ? JSON.parse(updatedArticle.tags) : [],
      gallery: parseStoredGallery(updatedArticle.gallery).items,
      galleryColumns: parseStoredGallery(updatedArticle.gallery).columns,
      galleryPosition: parseStoredGallery(updatedArticle.gallery).position,
      status: updatedArticle.status,
      updatedAt: updatedArticle.updatedAt?.toISOString(),
    };

    invalidateArticleCaches(updatedArticle.slug);

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
        const nextGallery = body.gallery !== undefined
          ? normalizeGalleryItems(body.gallery)
          : current.gallery;
        const nextGalleryColumns = body.galleryColumns !== undefined
          ? toGalleryColumns(body.galleryColumns)
          : toGalleryColumns(current.galleryColumns);
        const nextGalleryPosition = body.galleryPosition !== undefined
          ? toGalleryPosition(body.galleryPosition)
          : toGalleryPosition(current.galleryPosition);

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
          authorSocialPlatform:
            body.authorSocialPlatform !== undefined
              ? (String(body.authorSocialPlatform || '').trim() || null)
              : (current.authorSocialPlatform || null),
          authorSocialUrl:
            body.authorSocialUrl !== undefined
              ? (String(body.authorSocialUrl || '').trim() || null)
              : (current.authorSocialUrl || null),
          authorSocialPlatform2:
            body.authorSocialPlatform2 !== undefined
              ? (String(body.authorSocialPlatform2 || '').trim() || null)
              : (current.authorSocialPlatform2 || null),
          authorSocialUrl2:
            body.authorSocialUrl2 !== undefined
              ? (String(body.authorSocialUrl2 || '').trim() || null)
              : (current.authorSocialUrl2 || null),
          featured: body.featured !== undefined ? Boolean(body.featured) : current.featured,
          readTime: body.readTime ? Number(body.readTime) || current.readTime : current.readTime,
          tags: nextTags,
          gallery: nextGallery,
          galleryColumns: nextGalleryColumns,
          galleryPosition: nextGalleryPosition,
          status: body.status ? String(body.status) : current.status,
          publishedAt:
            body.publishedAt !== undefined
              ? (body.publishedAt ? new Date(body.publishedAt).toISOString() : null)
              : current.publishedAt,
          updatedAt: new Date().toISOString(),
        };

        fallbackArticles[index] = updated;
        await writeFallbackArticles(fallbackArticles);

        invalidateArticleCaches(updated.slug);

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
    await ensureArticleAuthorSocialColumns();

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
    const deletedArticleSlug = article.slug;
    await prisma.article.delete({ where: { id } });

    invalidateArticleCaches(deletedArticleSlug);

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

        invalidateArticleCaches();

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
    await ensureArticleAuthorSocialColumnsOnce();

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
      authorSocialPlatform: article.authorSocialPlatform || undefined,
      authorSocialUrl: article.authorSocialUrl || undefined,
      authorSocialPlatform2: article.authorSocialPlatform2 || undefined,
      authorSocialUrl2: article.authorSocialUrl2 || undefined,
      publishedAt: article.publishedAt?.toISOString(),
      readTime: article.readTime,
      featured: article.featured,
      tags: article.tags ? JSON.parse(article.tags) : [],
      status: article.status,
      gallery: parseStoredGallery(article.gallery).items,
      galleryColumns: parseStoredGallery(article.gallery).columns,
      galleryPosition: parseStoredGallery(article.gallery).position,
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
