import type { Metadata } from 'next';

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

const title = 'Investigations | Imyidagaduro | Intambwe Media';
const description = 'In-depth investigative journalism uncovering important stories affecting East Africa';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ky_RW',
    url: `${SITE_URL}/investigations`,
    siteName: 'Intambwe Media',
    title,
    description,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Intambwe Media - Investigations',
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
    canonical: `${SITE_URL}/investigations`,
  },
};

export default function InvestigationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
