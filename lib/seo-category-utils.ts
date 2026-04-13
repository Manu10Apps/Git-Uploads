/**
 * Category Page SEO Utilities
 * Functions to generate SEO-optimized metadata for category and section pages
 */

import type { Metadata } from 'next';

const SITE_URL = 'https://intambwemedia.com';
const SOCIAL_HANDLES = {
  twitter: '@intambwemedias',
  facebook: 'intambwemedia',
};

interface CategoryMetadataProps {
  slug: string;
  name: string;
  description?: string;
  image?: string;
}

/**
 * Generate SEO metadata for category pages
 * Optimized for East African keywords and news categories
 */
export function generateCategoryMetadata(props: CategoryMetadataProps): Metadata {
  const { slug, name, description, image } = props;
  const categoryUrl = `${SITE_URL}/category/${slug}`;
  const categoryImage = image || `${SITE_URL}/logo.png`;

  const baseDescription =
    description ||
    `Latest ${name} news from East Africa. Breaking stories, investigations, and analysis on ${name.toLowerCase()} in Rwanda, Kenya, and Tanzania.`;

  const truncatedDescription = baseDescription
    .substring(0, 160)
    .replace(/\s+$/, '');

  return {
    title: `${name} News | East Africa News | Intambwe Media`,
    description: truncatedDescription,
    keywords: [
      name,
      `${name} news`,
      `${name} Rwanda`,
      `${name} Kenya`,
      `${name} Tanzania`,
      `East Africa ${name}`,
      `${name} breaking news`,
      `${name} reports`,
    ],
    openGraph: {
      type: 'website',
      url: categoryUrl,
      title: `${name} News - East Africa's Leading Journalism`,
      description: baseDescription,
      siteName: 'Intambwe Media',
      locale: 'ky_RW',
      alternateLocale: ['en_US', 'sw_TZ'],
      images: [
        {
          url: categoryImage,
          width: 1200,
          height: 630,
          alt: `${name} - Intambwe Media`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: SOCIAL_HANDLES.twitter,
      creator: SOCIAL_HANDLES.twitter,
      title: `${name} News | Intambwe Media`,
      description: truncatedDescription,
      images: [categoryImage],
    },
    alternates: {
      canonical: categoryUrl,
      languages: {
        'x-default': categoryUrl,
        rw: `${SITE_URL}/category/${slug}`,
        en: `${SITE_URL}/en/category/${slug}`,
        sw: `${SITE_URL}/sw/category/${slug}`,
      },
    },
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
  };
}

/**
 * Special metadata for high-priority sections
 */
export const SECTION_METADATA: Record<string, { description: string; keywords: string[] }> = {
  breaking: {
    description:
      'Breaking news from East Africa. Latest updates from Rwanda, Kenya, and Tanzania as events unfold.',
    keywords: [
      'breaking news',
      'latest news',
      'Rwanda breaking news',
      'Kenya breaking news',
      'Tanzania breaking news',
      'East Africa breaking news',
      'live news',
      'news today',
    ],
  },
  investigations: {
    description:
      'In-depth investigative journalism revealing truth across East Africa. Uncovering corruption, environmental issues, and human rights violations in Rwanda, Kenya, and Tanzania.',
    keywords: [
      'investigative journalism',
      'investigations',
      'Rwanda investigations',
      'Kenya investigations',
      'Tanzania investigations',
      'East Africa investigations',
      'journalism Rwanda',
      'investigative reporters',
      'exposé',
    ],
  },
  politics: {
    description:
      'Political news and analysis from Rwanda, Kenya, and Tanzania. Government updates, electoral coverage, and political commentary for East Africa.',
    keywords: [
      'politics',
      'political news',
      'Rwanda politics',
      'Kenya politics',
      'Tanzania politics',
      'government news',
      'elections',
      'political analysis',
    ],
  },
  business: {
    description:
      'Business and economic news from East Africa. Market updates, corporate news, and economic analysis for Rwanda, Kenya, and Tanzania.',
    keywords: [
      'business news',
      'economy',
      'Rwanda business',
      'Kenya business',
      'Tanzania business',
      'market news',
      'corporate news',
      'East Africa economy',
    ],
  },
  technology: {
    description:
      'Technology and innovation news from East Africa. Digital transformation, startup coverage, and tech trends in Rwanda, Kenya, and Tanzania.',
    keywords: [
      'technology news',
      'tech',
      'innovation',
      'Rwanda tech',
      'Kenya technology',
      'Tanzania tech',
      'startups',
      'digital transformation',
    ],
  },
};

/**
 * Generate metadata for special sections (breaking, investigations, etc.)
 */
export function generateSectionMetadata(sectionSlug: string): Metadata {
  const sectionSlugLower = sectionSlug.toLowerCase();
  const sectionData = SECTION_METADATA[sectionSlugLower];

  if (!sectionData) {
    return generateCategoryMetadata({
      slug: sectionSlug,
      name: sectionSlug.charAt(0).toUpperCase() + sectionSlug.slice(1),
    });
  }

  const sectionUrl = `${SITE_URL}/${sectionSlug}`;
  const sectionName =
    sectionSlug.charAt(0).toUpperCase() + sectionSlug.slice(1);
  const baseTitle = `${sectionName} | East Africa News | Intambwe Media`;

  return {
    title: baseTitle,
    description: sectionData.description.substring(0, 160),
    keywords: sectionData.keywords,
    openGraph: {
      type: 'website',
      url: sectionUrl,
      title: `${sectionName} - East Africa's Leading Journalism`,
      description: sectionData.description,
      siteName: 'Intambwe Media',
      locale: 'ky_RW',
      alternateLocale: ['en_US', 'sw_TZ'],
      images: [
        {
          url: `${SITE_URL}/logo.png`,
          width: 1200,
          height: 630,
          alt: `${sectionName} - Intambwe Media`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: SOCIAL_HANDLES.twitter,
      creator: SOCIAL_HANDLES.twitter,
      title: `${sectionName} | Intambwe Media`,
      description: sectionData.description.substring(0, 160),
      images: [`${SITE_URL}/logo.png`],
    },
    alternates: {
      canonical: sectionUrl,
      languages: {
        'x-default': sectionUrl,
        rw: `${SITE_URL}/${sectionSlug}`,
        en: `${SITE_URL}/en/${sectionSlug}`,
        sw: `${SITE_URL}/sw/${sectionSlug}`,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
  };
}
