import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@/styles/globals.css';
import { MaintenanceScreen } from '@/app/components/MaintenanceScreen';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { TopBar } from '@/app/components/TopBar';
import { AnalyticsProvider } from '@/app/components/AnalyticsProvider';
import { getMaintenanceSettings, shouldBypassMaintenance } from '@/lib/maintenance';

export const metadata: Metadata = {
  title: 'Intambwe Media | Amakuru Agezweho | Igihe Cyose ',
  description:
    'Amakuru Agezweho | Igihe Cyose',
  keywords: ['News', 'East Africa', 'Rwanda', 'Journalism', 'Amakuru', 'Intambwe', 'Breaking News', 'Politics', 'Business', 'Technology'],
  authors: [{ name: 'Intambwe Media' }],
  creator: 'Intambwe Media',
  publisher: 'Intambwe Media',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ky_RW',
    alternateLocale: ['en_US', 'sw_TZ'],
    url: 'https://intambwemedia.com',
    siteName: 'Intambwe Media',
    title: 'Intambwe Media | Amakuru Agezweho | Igihe Cyose',
    description: 'Amakuru Agezweho | Igihe Cyose',
    images: [{
      url: 'https://intambwemedia.com/logo.png',
      width: 1200,
      height: 630,
      alt: 'Intambwe Media Logo',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@intambwemedias',
    creator: '@intambwemedias',
    title: 'Intambwe Media | Amakuru Agezweho | Igihe Cyose',
    description: 'Amakuru Agezweho | Igihe Cyose',
    images: ['https://intambwemedia.com/logo.png'],
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
  alternates: {
    languages: {
      ky: 'https://intambwemedia.com/ky',
      en: 'https://intambwemedia.com/en',
      sw: 'https://intambwemedia.com/sw',
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-pathname') || '/';
  const bypassMaintenance = shouldBypassMaintenance(pathname);
  const maintenanceSettings = bypassMaintenance ? null : await getMaintenanceSettings();
  const showMaintenance = Boolean(maintenanceSettings?.enabled);

  return (
    <html lang="ky" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e2001a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="canonical" href="https://intambwemedia.com" />
        <link rel="icon" href="/logo.png" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        {showMaintenance && <meta name="robots" content="noindex, nofollow" />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'NewsMediaOrganization',
              name: 'Intambwe Media',
              url: 'https://intambwemedia.com',
              logo: 'https://intambwemedia.com/logo.png',
              description: 'Amakuru Agezweho | Igihe Cyose',
              sameAs: [
                'https://twitter.com/intambwemedias',
                'https://facebook.com/intambwemedia',
                'https://youtube.com/@intambwemedia',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Editorial',
              },
            }),
          }}
        />
        {/* Analytics: Using Plausible Privacy-First Analytics */}
        <script defer data-domain="intambwemedia.com" src="https://plausible.io/js/script.js"></script>
      </head>
      <body>
        <AnalyticsProvider />
        <ThemeProvider>
          {showMaintenance ? (
            <MaintenanceScreen message={maintenanceSettings?.message || ''} />
          ) : (
            <>
              <TopBar />
              {children}
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}

