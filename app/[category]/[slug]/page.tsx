import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveOgImageUrl, validateImageUrl, getOgImageType } from '@/lib/social-media-metadata';
import ArticlePageClient from './ArticlePageClient';

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

async function getTranslation(articleId: number, lang: string) {
  try {
    return await prisma.articleTranslation.findUnique({
      where: { articleId_language: { articleId, language: lang } },
      select: { title: true, excerpt: true },
    });
  } catch {
    return null;
  }
}

async function getArticleBySlug(slug: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        excerpt: true,
        image: true,
        gallery: true,
        author: true,
        seoTitle: true,
        seoDescription: true,
        category: { select: { slug: true, name: true } },
        publishedAt: true,
      },
    });
    return article;
  } catch {
    return null;
  }
}

/**
 * Resolves article image to absolute URL suitable for social media sharing
 * Uses new validation to ensure images are publicly accessible
 * Falls back to first gallery image if featured image not available
 */
function resolveAbsoluteImageUrl(
  image: string | null | undefined,
  gallery: string | null | undefined
): string {
  // Try featured image first
  let imageUrl = resolveOgImageUrl(image, normalizeArticleImageUrl);
  
  // If featured image is unavailable and we have gallery, try first gallery image
  if (imageUrl === `${SITE_URL}/logo.png` && gallery) {
    try {
      const galleryItems = JSON.parse(gallery);
      if (Array.isArray(galleryItems) && galleryItems.length > 0) {
        const firstImageUrl = galleryItems[0]?.url;
        if (firstImageUrl) {
          const fallbackUrl = resolveOgImageUrl(firstImageUrl, normalizeArticleImageUrl);
          if (fallbackUrl !== `${SITE_URL}/logo.png`) {
            console.log(`[Article Metadata] Using first gallery image as fallback for og:image`);
            imageUrl = fallbackUrl;
          }
        }
      }
    } catch (err) {
      console.warn(`[Article Metadata] Failed to parse gallery for fallback:`, err);
    }
  }
  
  return imageUrl;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await searchParams;
  const article = await getArticleBySlug(slug);

  const startTime = Date.now();
  console.log(`[ARTICLE:METADATA] Starting metadata generation for slug: ${slug}, lang: ${lang}`);

  if (!article) {
    console.warn(`[ARTICLE:METADATA] Article not found for slug: ${slug}`);
    return {
      title: 'Inkuru Ntiyabonetse | Intambwe Media',
      description: 'Inkuru ushaka ntiyabonetse.',
      openGraph: {
        images: [{
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: 'Intambwe Media',
        }],
      },
    };
  }

  let title = article.seoTitle || article.title;
  let description = article.seoDescription || article.excerpt;

  // If a valid translation language is requested, fetch translated title/excerpt
  const validLang = lang && ['en', 'sw'].includes(lang) ? lang : null;
  if (validLang && article.id) {
    const translation = await getTranslation(article.id, validLang);
    if (translation) {
      console.log(`[ARTICLE:METADATA] Using ${validLang} translation for title/description`);
      title = translation.title || title;
      description = translation.excerpt || description;
    }
  }

  // CRITICAL: Ensure image URL is absolute and valid for social media crawlers
  // Falls back to gallery if featured image unavailable
  const imageUrl = resolveAbsoluteImageUrl(article.image, article.gallery);
  console.log(`[ARTICLE:METADATA] Image resolution: featured="${article.image}" → final="${imageUrl}"`);
  
  const imageMimeType = getOgImageType(imageUrl);
  const articleUrl = validLang
    ? `${SITE_URL}/article/${slug}?lang=${validLang}`
    : `${SITE_URL}/article/${slug}`;

  // Ensure description is not too long for social media
  const truncatedDescription = description
    ? description.substring(0, 160).replace(/\s+$/, '')
    : 'Amakuru Agezweho | Igihe Cyose';

  console.log(`[ARTICLE:METADATA] ✅ Metadata generated successfully for ${slug}:`, {
    title,
    imageUrl,
    ogType: 'article',
    lang: validLang || 'ky',
    generationTimeMs: Date.now() - startTime,
  });

  return {
    title: `${title} | Intambwe Media`,
    description: truncatedDescription,
    authors: [{ name: article.author }],
    creator: article.author,
    keywords: [article.category?.name || 'News', 'East Africa', 'Rwanda', 'Kenya', 'Tanzania', 'Journalism', 'Breaking News'],
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      type: 'article',
      locale: validLang === 'en' ? 'en_US' : validLang === 'sw' ? 'sw_KE' : 'ky_RW',
      url: articleUrl,
      siteName: 'Intambwe Media',
      title,
      description: truncatedDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: imageMimeType,
        },
      ],
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.publishedAt?.toISOString(),
      authors: [article.author],
      section: article.category?.name || 'News',
      tags: [article.category?.name || 'News', 'East Africa', 'Breaking News'],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@intambwemedias',
      creator: '@intambwemedias',
      title,
      description: truncatedDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: articleUrl,
      languages: {
        'x-default': articleUrl,
        rw: `${SITE_URL}/rw/article/${slug}`,
        en: `${SITE_URL}/en/article/${slug}`,
        sw: `${SITE_URL}/sw/article/${slug}`,
      },
    },
  };
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { slug, category } = await params;
  const { lang } = await searchParams;
  const article = await getArticleBySlug(slug);
  
  // Generate JSON-LD structured data for link previews
  let jsonLdData: object | null = null;
  if (article) {
    const validLang = lang && ['en', 'sw'].includes(lang) ? lang : null;
    let title = article.seoTitle || article.title;
    let description = article.seoDescription || article.excerpt;
    
    if (validLang && article.id) {
      const translation = await getTranslation(article.id, validLang);
      if (translation) {
        title = translation.title || title;
        description = translation.excerpt || description;
      }
    }
    
    const imageUrl = resolveAbsoluteImageUrl(article.image, article.gallery);
    const articleUrl = validLang
      ? `${SITE_URL}/article/${slug}?lang=${validLang}`
      : `${SITE_URL}/article/${slug}`;
    
    jsonLdData = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: title,
      description: description,
      image: [imageUrl],
      datePublished: article.publishedAt?.toISOString() || new Date().toISOString(),
      dateModified: article.publishedAt?.toISOString() || new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: article.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Intambwe Media',
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/logo.png`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': articleUrl,
      },
    };
  }

  return (
    <>
      {jsonLdData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
      )}
      <ArticlePageClient slug={slug} category={category} />
    </>
  );
}
