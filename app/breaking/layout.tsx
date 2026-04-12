import type { Metadata } from 'next';

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

const title = 'Breaking News | Intambwe Media';
const description = 'Latest breaking news stories from East Africa';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ky_RW',
    url: `${SITE_URL}/breaking`,
    siteName: 'Intambwe Media',
    title,
    description,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Intambwe Media - Breaking News',
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
    canonical: `${SITE_URL}/breaking`,
  },
};

export default function BreakingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
