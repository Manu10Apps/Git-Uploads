import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';
import { Roboto_Condensed } from 'next/font/google';
import '@/styles/globals.css';

const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
  variable: '--font-roboto-condensed',
  preload: true,
});
import { MaintenanceScreen } from '@/app/components/MaintenanceScreen';
import { ThemeProvider } from '@/app/components/ThemeProvider';
import { TopBar } from '@/app/components/TopBar';
import { AnalyticsProvider } from '@/app/components/AnalyticsProvider';
import { HreflangTags } from '@/app/components/HreflangTags';
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
  icons: {
    icon: [
      { url: '/favicon.ico?v=20260403', sizes: 'any' },
      { url: '/favicon.png?v=20260403', type: 'image/png' },
    ],
    apple: [{ url: '/favicon.png?v=20260403', type: 'image/png' }],
    shortcut: ['/favicon.ico?v=20260403'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-pathname') || '/';
  const locale = requestHeaders.get('x-language') || 'ky';
  const htmlLang = locale === 'ky' ? 'rw' : locale;
  const bypassMaintenance = shouldBypassMaintenance(pathname);
  const maintenanceSettings = bypassMaintenance ? null : await getMaintenanceSettings();
  const showMaintenance = Boolean(maintenanceSettings?.enabled);

  return (
    <html lang={htmlLang} suppressHydrationWarning data-scroll-behavior="smooth" className={robotoCondensed.variable}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#e2001a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="canonical" href="https://intambwemedia.com" />
        <link rel="icon" href="/favicon.ico?v=20260403" sizes="any" />
        <link rel="icon" href="/favicon.png?v=20260403" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png?v=20260403" />
        <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
        <HreflangTags />
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
        <Script
          src="https://analytics.intambwemedia.com/script.js"
          data-website-id="9bd85831-989a-43aa-9ae5-65a111782549"
          strategy="lazyOnload"
        />
        <Script
          src="https://js.puter.com/v2/"
          strategy="afterInteractive"
        />
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

