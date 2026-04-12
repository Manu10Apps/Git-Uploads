import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface LayoutProps {
  params: Promise<{ category: string }>;
  children: React.ReactNode;
}

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

const categoryMeta: Record<string, { title: string; description: string }> = {
  amakuru: { title: 'News', description: 'Latest news from East Africa' },
  politiki: { title: 'Politics', description: 'Political news and analysis' },
  ubuzima: { title: 'Health', description: 'Health and wellness news' },
  uburezi: { title: 'Education', description: 'Education news and updates' },
  ubukungu: { title: 'Business', description: 'Business and economic news' },
  siporo: { title: 'Sports', description: 'Sports news and updates' },
  ikoranabuhanga: { title: 'Technology', description: 'Technology and innovation news' },
  imyidagaduro: { title: 'Entertainment', description: 'Entertainment and culture' },
  ubutabera: { title: 'Justice', description: 'Justice and legal news' },
  ibidukikije: { title: 'Environment', description: 'Environmental news' },
  imyemerere: { title: 'Faith', description: 'Faith and religion' },
  'afurika-yiburasirazuba': { title: 'East Africa', description: 'East Africa news' },
  'mu-mahanga': { title: 'International', description: 'International news' },
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { category } = await params;
  const meta = categoryMeta[category] || { title: 'Category', description: 'Articles in this category' };
  
  const url = `${SITE_URL}/category/${category}`;
  const title = `${meta.title} | Intambwe Media`;
  const description = meta.description;

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      locale: 'ky_RW',
      url,
      siteName: 'Intambwe Media',
      title,
      description,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: meta.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@intambwemedias',
      creator: '@intambwemedias',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function CategoryLayout({ children }: LayoutProps) {
  return children;
}
