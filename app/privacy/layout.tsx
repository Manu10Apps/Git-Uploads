import type { Metadata } from 'next';

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

const title = 'Privacy Policy | Intambwe Media';
const description = 'Review our privacy policy to understand how we collect, use, and protect your personal information.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ky_RW',
    url: `${SITE_URL}/privacy`,
    siteName: 'Intambwe Media',
    title,
    description,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Intambwe Media - Privacy Policy',
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
    canonical: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
