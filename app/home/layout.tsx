import type { Metadata } from 'next';

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

const title = 'Home | Intambwe Media';
const description = 'Intambwe Media - Your source for news from East Africa and beyond. Breaking news, investigations, and in-depth reporting.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ky_RW',
    url: `${SITE_URL}/home`,
    siteName: 'Intambwe Media',
    title,
    description,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Intambwe Media',
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
    canonical: `${SITE_URL}/home`,
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
