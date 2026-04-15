import { prisma } from '@/lib/prisma';
import {
  translateArticle,
  translateCategory,
  generateContentHash,
  DEFAULT_LANGUAGE,
  type SupportedLanguage,
} from '@/lib/translation-service';

/**
 * In-memory translation cache for hot content.
 * TTL: 1 hour. Evicts least-recently-used entries when full.
 */
const MEMORY_CACHE = new Map<string, { data: any; expiresAt: number }>();
const MEMORY_CACHE_MAX_SIZE = 500;
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(type: string, id: number | string, lang: string): string {
  return `${type}:${id}:${lang}`;
}

function getFromMemoryCache<T>(key: string): T | null {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.data as T;
}

function setMemoryCache(key: string, data: any): void {
  // Evict oldest entries if cache is full
  if (MEMORY_CACHE.size >= MEMORY_CACHE_MAX_SIZE) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    if (firstKey) MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(key, { data, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
}

export function invalidateArticleCache(articleId: number): void {
  for (const key of MEMORY_CACHE.keys()) {
    if (key.startsWith(`article:${articleId}:`)) {
      MEMORY_CACHE.delete(key);
    }
  }
}

export function invalidateCategoryCache(categoryId: number): void {
  for (const key of MEMORY_CACHE.keys()) {
    if (key.startsWith(`category:${categoryId}:`)) {
      MEMORY_CACHE.delete(key);
    }
  }
}

// ─── Article Translation ────────────────────────────

interface ArticleTranslationData {
  title: string;
  excerpt: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  galleryCaptions?: Array<{ url: string; caption: string }>;
  translationSource: string;
  translatedAt: Date;
}

/**
 * Get a translated article. Tries: memory cache → DB → AI translation.
 * If language is default (ky), returns null (use original).
 */
export async function getArticleTranslation(
  articleId: number,
  language: SupportedLanguage
): Promise<ArticleTranslationData | null> {
  if (language === DEFAULT_LANGUAGE) return null;

  const cacheKey = getCacheKey('article', articleId, language);

  // 1. Check memory cache
  const cached = getFromMemoryCache<ArticleTranslationData>(cacheKey);
  if (cached) return cached;

  // 2. Check database
  const dbTranslation = await prisma.articleTranslation.findUnique({
    where: { articleId_language: { articleId, language } },
  });

  if (dbTranslation) {
    // Verify version hash is still current
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, content: true },
    });

    if (article) {
      const currentHash = generateContentHash(article.title, article.content);

      if (dbTranslation.versionHash === currentHash) {
        const galleryCaptions = dbTranslation.galleryCaptions
          ? JSON.parse(dbTranslation.galleryCaptions)
          : undefined;

        const result: ArticleTranslationData = {
          title: dbTranslation.title,
          excerpt: dbTranslation.excerpt,
          content: dbTranslation.content,
          seoTitle: dbTranslation.seoTitle || undefined,
          seoDescription: dbTranslation.seoDescription || undefined,
          galleryCaptions,
          translationSource: dbTranslation.translationSource,
          translatedAt: dbTranslation.translatedAt,
        };
        setMemoryCache(cacheKey, result);
        return result;
      }

      // Hash mismatch — original was updated, re-translate
      return await createArticleTranslation(articleId, language);
    }
  }

  // 3. No translation exists — create one via AI
  return await createArticleTranslation(articleId, language);
}

/**
 * Create or update an article translation via AI.
 */
export async function createArticleTranslation(
  articleId: number,
  language: SupportedLanguage
): Promise<ArticleTranslationData | null> {
  if (language === DEFAULT_LANGUAGE) return null;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      title: true,
      excerpt: true,
      content: true,
      seoTitle: true,
      seoDescription: true,
      gallery: true,
    },
  });

  if (!article) return null;

  // Parse gallery JSON if exists
  let gallery: Array<{ url: string; caption: string }> | undefined;
  if (article.gallery) {
    try {
      gallery = JSON.parse(article.gallery);
    } catch {
      gallery = undefined;
    }
  }

  const versionHash = generateContentHash(article.title, article.content);

  const translated = await translateArticle(
    {
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      gallery,
    },
    DEFAULT_LANGUAGE,
    language
  );

  const saved = await prisma.articleTranslation.upsert({
    where: { articleId_language: { articleId, language } },
    create: {
      articleId,
      language,
      title: translated.title,
      excerpt: translated.excerpt,
      content: translated.content,
      seoTitle: translated.seoTitle || null,
      seoDescription: translated.seoDescription || null,
      galleryCaptions: translated.galleryCaptions
        ? JSON.stringify(translated.galleryCaptions)
        : null,
      translationSource: 'ai',
      versionHash,
    },
    update: {
      title: translated.title,
      excerpt: translated.excerpt,
      content: translated.content,
      seoTitle: translated.seoTitle || null,
      seoDescription: translated.seoDescription || null,
      galleryCaptions: translated.galleryCaptions
        ? JSON.stringify(translated.galleryCaptions)
        : null,
      translationSource: 'ai',
      versionHash,
      translatedAt: new Date(),
    },
  });

  const galleryCaptions = saved.galleryCaptions
    ? JSON.parse(saved.galleryCaptions)
    : undefined;

  const result: ArticleTranslationData = {
    title: saved.title,
    excerpt: saved.excerpt,
    content: saved.content,
    seoTitle: saved.seoTitle || undefined,
    seoDescription: saved.seoDescription || undefined,
    galleryCaptions,
    translationSource: saved.translationSource,
    translatedAt: saved.translatedAt,
  };

  const cacheKey = getCacheKey('article', articleId, language);
  setMemoryCache(cacheKey, result);

  return result;
}

// ─── Category Translation ───────────────────────────

interface CategoryTranslationData {
  name: string;
  description: string | null;
}

/**
 * Get a translated category name and description.
 */
export async function getCategoryTranslation(
  categoryId: number,
  language: SupportedLanguage
): Promise<CategoryTranslationData | null> {
  if (language === DEFAULT_LANGUAGE) return null;

  const cacheKey = getCacheKey('category', categoryId, language);

  const cached = getFromMemoryCache<CategoryTranslationData>(cacheKey);
  if (cached) return cached;

  const dbTranslation = await prisma.categoryTranslation.findUnique({
    where: { categoryId_language: { categoryId, language } },
  });

  if (dbTranslation) {
    const result: CategoryTranslationData = {
      name: dbTranslation.name,
      description: dbTranslation.description,
    };
    setMemoryCache(cacheKey, result);
    return result;
  }

  // Create translation
  return await createCategoryTranslation(categoryId, language);
}

/**
 * Create a category translation via AI.
 */
export async function createCategoryTranslation(
  categoryId: number,
  language: SupportedLanguage
): Promise<CategoryTranslationData | null> {
  if (language === DEFAULT_LANGUAGE) return null;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { name: true, description: true },
  });

  if (!category) return null;

  const translated = await translateCategory(
    category.name,
    category.description,
    DEFAULT_LANGUAGE,
    language
  );

  const saved = await prisma.categoryTranslation.upsert({
    where: { categoryId_language: { categoryId, language } },
    create: {
      categoryId,
      language,
      name: translated.name,
      description: translated.description,
    },
    update: {
      name: translated.name,
      description: translated.description,
      translatedAt: new Date(),
    },
  });

  const result: CategoryTranslationData = {
    name: saved.name,
    description: saved.description,
  };

  const cacheKey = getCacheKey('category', categoryId, language);
  setMemoryCache(cacheKey, result);

  return result;
}

// ─── Bulk Translation (Queue) ───────────────────────

/**
 * Queue translations for a newly published article.
 * Translates into all non-default languages.
 */
export async function queueArticleTranslations(articleId: number): Promise<void> {
  const nonDefaultLangs = (['en', 'sw'] as SupportedLanguage[]).filter(
    (l) => l !== DEFAULT_LANGUAGE
  );

  // Run translations in parallel
  await Promise.allSettled(
    nonDefaultLangs.map((lang) => createArticleTranslation(articleId, lang))
  );
}

/**
 * Pre-translate all categories for all languages.
 */
export async function translateAllCategories(): Promise<void> {
  const categories = await prisma.category.findMany({ select: { id: true } });
  const nonDefaultLangs = (['en', 'sw'] as SupportedLanguage[]).filter(
    (l) => l !== DEFAULT_LANGUAGE
  );

  await Promise.allSettled(
    categories.flatMap((cat) =>
      nonDefaultLangs.map((lang) => createCategoryTranslation(cat.id, lang))
    )
  );
}
