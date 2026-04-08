'use client';

import { usePathname } from 'next/navigation';

const SITE_URL = 'https://intambwemedia.com';

/**
 * Generates hreflang alternate links and canonical URL for multilingual SEO.
 * Place in <head> via a client component or in layout metadata.
 */
export function HreflangTags() {
  const pathname = usePathname();

  const locales = [
    { urlPrefix: 'rw', hreflang: 'rw' },
    { urlPrefix: 'en', hreflang: 'en' },
    { urlPrefix: 'sw', hreflang: 'sw' },
  ];

  // Default (unprefixed) path is Kinyarwanda
  const basePath = pathname || '/';

  return (
    <>
      {/* x-default points to the default language version (no prefix) */}
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}${basePath}`} />

      {/* Each language version */}
      {locales.map((locale) => (
        <link
          key={locale.hreflang}
          rel="alternate"
          hrefLang={locale.hreflang}
          href={`${SITE_URL}/${locale.urlPrefix}${basePath}`}
        />
      ))}
    </>
  );
}

/**
 * Generate hreflang metadata for server components (used in generateMetadata).
 */
export function getHreflangAlternates(path: string) {
  return {
    canonical: `${SITE_URL}${path}`,
    languages: {
      'x-default': `${SITE_URL}${path}`,
      rw: `${SITE_URL}/rw${path}`,
      en: `${SITE_URL}/en${path}`,
      sw: `${SITE_URL}/sw${path}`,
    },
  };
}
