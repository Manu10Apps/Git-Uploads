import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveArticleImage } from '@/lib/article-images';
import { NAV_CATEGORY_SLUGS } from '@/lib/nav-categories';

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

function resolveFallbackCategorySlug(categoryId: unknown) {
  const raw = String(categoryId || '').trim();
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= NAV_CATEGORY_SLUGS.length) {
    return NAV_CATEGORY_SLUGS[parsed - 1];
  }

  if (NAV_CATEGORY_SLUGS.includes(raw)) {
    return raw;
  }

  return null;
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
    image: resolveArticleImage(article.image, typeof article.gallery === 'string' ? article.gallery : JSON.stringify(article.gallery || [])),
    category: article.category,
    author: article.author,
    publishedAt: article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : undefined,
    readTime: article.readTime,
    featured: article.featured,
    tags: Array.isArray(article.tags) ? article.tags : [],
    status: article.status,
    gallery: article.gallery || [],
  };
}

function generateUniqueSlug(title: string, usedSlugs: Set<string>) {
  const baseSlug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || `article-${Date.now()}`;

  let nextSlug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

const allowFallbackStorage = process.env.NODE_ENV !== 'production' || process.env.ALLOW_FALLBACK_STORAGE === 'true';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const limit = searchParams.get('limit');
  const featured = searchParams.get('featured');
  const status = searchParams.get('status');
  const includeAll = searchParams.get('includeAll') === 'true';
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const now = new Date();

    let where: any = {};

    if (!includeAll) {
      where.status = 'published';
      where.publishedAt = {
        lte: now, // Only published articles with publishedAt <= now
      };
    } else if (status && status !== 'all') {
      where.status = status;
    }

    // Filter by category slug
    if (category && category !== 'all') {
      where.category = {
        slug: category,
      };
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const take = limit ? parseInt(limit) : includeAll ? 100 : 10;
    const skip = (page - 1) * take;

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: { category: true },
        orderBy: { publishedAt: 'desc' },
        take,
        skip,
      }),
      prisma.article.count({ where }),
    ]);

    // Format response to match frontend expectations
    const formattedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
          image: resolveArticleImage(article.image, article.gallery),
      category: article.category.slug,
      author: article.author,
      publishedAt: article.publishedAt?.toLocaleDateString(),
      readTime: article.readTime,
      featured: article.featured,
      tags: article.tags ? JSON.parse(article.tags) : [],
      gallery: article.gallery ? JSON.parse(article.gallery) : [],
    }));

    return NextResponse.json({
      success: true,
      data: formattedArticles,
      pagination: {
        total,
        page,
        limit: take,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('Failed to fetch articles:', error);

    if (!allowFallbackStorage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database unavailable. Fix PostgreSQL connection for this environment.',
        },
        { status: 503 }
      );
    }

    const take = limit ? parseInt(limit) : includeAll ? 100 : 10;
    const allFallbackArticles = await readFallbackArticles();

    const filtered = allFallbackArticles.filter((article) => {
      if (!includeAll) {
        if (article.status !== 'published') {
          return false;
        }

        if (article.publishedAt && new Date(article.publishedAt) > new Date()) {
          return false;
        }
      } else if (status && status !== 'all' && article.status !== status) {
        return false;
      }

      if (category && category !== 'all' && article.category !== category) {
        return false;
      }

      if (featured === 'true' && !article.featured) {
        return false;
      }

      return true;
    });

    filtered.sort((a, b) => {
      const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bDate - aDate;
    });

    const total = filtered.length;
    const skip = (page - 1) * take;
    const paginated = filtered.slice(skip, skip + take).map(toClientArticle);

    return NextResponse.json(
      {
        success: true,
        data: paginated,
        pagination: {
          total,
          page,
          limit: take,
          pages: Math.ceil(total / take),
        },
        degraded: true,
        message: 'Database unavailable, returned file-backed article list.',
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  let parsedBody: any = null;

  try {
    parsedBody = await request.json();
    const body = parsedBody;
    const {
      title,
      excerpt,
      content,
      category_id,
      author,
      image,
      tags,
      gallery,
      readTime,
      featured,
      status = 'draft',
      published_at,
      scheduled_for,
    } = body;

    // Normalize the image path for DB storage. Do NOT use resolveArticleImage here
    // because its existsSync check must never run on write paths – only on reads.
    const imageToStore: string | null = image
      ? (normalizeArticleImageUrl(String(image)) ?? null)
      : null;

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!excerpt || !excerpt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Excerpt is required' },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { success: false, error: 'Category is required' },
        { status: 400 }
      );
    }

    if (!author || !author.trim()) {
      return NextResponse.json(
        { success: false, error: 'Author is required' },
        { status: 400 }
      );
    }

    // Resolve category by ID first; fallback to slug for compatibility.
    const categoryIdRaw = String(category_id).trim();
    const parsedCategoryId = Number(categoryIdRaw);

    let category = Number.isInteger(parsedCategoryId)
      ? await prisma.category.findUnique({
          where: { id: parsedCategoryId },
        })
      : null;

    if (!category && categoryIdRaw) {
      category = await prisma.category.findUnique({
        where: { slug: categoryIdRaw },
      });
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: `Invalid category: ${category_id}` },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = (title).toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');

    const article = await prisma.article.create({
      data: {
        title: title.trim(),
        slug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        categoryId: category.id,
        author: author.trim(),
        image: imageToStore,
        tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
        gallery: gallery && Array.isArray(gallery) ? JSON.stringify(gallery) : null,
        readTime: readTime || 5,
        featured: featured || false,
        status,
        publishedAt: status === 'published' ? published_at ? new Date(published_at) : new Date() : null,
        scheduledFor: status === 'scheduled' ? new Date(scheduled_for) : null,
      },
      include: { category: true },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          image: resolveArticleImage(article.image, article.gallery),
          category: article.category.slug,
          author: article.author,
          publishedAt: article.publishedAt?.toLocaleDateString(),
          readTime: article.readTime,
          featured: article.featured,
          status: article.status,
          message: 'Article created successfully',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create article:', error);

    if (isDatabaseUnavailableError(error)) {
      if (!allowFallbackStorage) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database unavailable. Fix PostgreSQL connection for this environment.',
          },
          { status: 503 }
        );
      }

      try {
        const body = parsedBody;
        const title = String(body?.title || '').trim();
        const excerpt = String(body?.excerpt || '').trim();
        const content = String(body?.content || '').trim();
        const author = String(body?.author || '').trim();
        const status = String(body?.status || 'draft');
        const featured = Boolean(body?.featured);
        const readTime = Number(body?.readTime) || 5;
        const categorySlug = resolveFallbackCategorySlug(body?.category_id);

        if (!title || !excerpt || !content || !author) {
          return NextResponse.json(
            {
              success: false,
              error: 'Missing required fields for fallback save.',
            },
            { status: 400 }
          );
        }

        if (!categorySlug) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid category selected for fallback save.',
            },
            { status: 400 }
          );
        }

        const tags = Array.isArray(body?.tags)
          ? body.tags.map((tag: unknown) => String(tag).trim()).filter((tag: string) => Boolean(tag))
          : [];

        const gallery = Array.isArray(body?.gallery)
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
          : [];

        const fallbackArticles = await readFallbackArticles();
        const usedSlugs = new Set(fallbackArticles.map((article) => article.slug));
        const slug = generateUniqueSlug(title, usedSlugs);
        const nowIso = new Date().toISOString();
        const publishedAt =
          status === 'published'
            ? (body?.published_at ? new Date(body.published_at).toISOString() : nowIso)
            : null;
        const scheduledFor = status === 'scheduled' && body?.scheduled_for ? new Date(body.scheduled_for).toISOString() : null;

        const fallbackArticle: FallbackArticle = {
          id: fallbackArticles.reduce((maxId, article) => Math.max(maxId, article.id), 0) + 1,
          title,
          slug,
          excerpt,
          content,
          image: body?.image ? (normalizeArticleImageUrl(String(body.image)) ?? null) : null,
          category: categorySlug,
          author,
          status,
          publishedAt,
          scheduledFor,
          readTime,
          featured,
          tags,
          gallery,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        fallbackArticles.push(fallbackArticle);
        await writeFallbackArticles(fallbackArticles);

        return NextResponse.json(
          {
            success: true,
            degraded: true,
            message: 'Database unavailable. Article saved to fallback storage.',
            data: toClientArticle(fallbackArticle),
          },
          { status: 201 }
        );
      } catch (fallbackError) {
        console.error('Fallback article save failed:', fallbackError);

        return NextResponse.json(
          {
            success: false,
            error: 'Database unavailable and fallback save failed.',
          },
          { status: 503 }
        );
      }
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Article slug already exists. Please use a different title.' },
        { status: 409 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create article' },
      { status: 500 }
    );
  }
}
