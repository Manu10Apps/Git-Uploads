import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import ArticlePageClient from './ArticlePageClient';

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getArticleBySlug(slug: string) {
  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        title: true,
        excerpt: true,
        image: true,
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

function resolveAbsoluteImageUrl(image: string | null | undefined): string {
  const normalized = normalizeArticleImageUrl(image);
  if (!normalized) return DEFAULT_OG_IMAGE;

  // Already absolute
  if (/^https?:\/\//i.test(normalized)) return normalized;

  // Relative path → absolute
  return `${SITE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Inkuru Ntiyabonetse | Intambwe Media',
      description: 'Inkuru ushaka ntiyabonetse.',
    };
  }

  const title = article.seoTitle || article.title;
  const description = article.seoDescription || article.excerpt;
  const imageUrl = resolveAbsoluteImageUrl(article.image);
  const articleUrl = `${SITE_URL}/article/${slug}`;

  return {
    title: `${title} | Intambwe Media`,
    description,
    authors: [{ name: article.author }],
    openGraph: {
      type: 'article',
      locale: 'ky_RW',
      url: articleUrl,
      siteName: 'Intambwe Media',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      publishedTime: article.publishedAt?.toISOString(),
      authors: [article.author],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@intambwemedias',
      creator: '@intambwemedias',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: articleUrl,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  return <ArticlePageClient slug={slug} />;
}
