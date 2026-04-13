/**
 * Organization Schema Component
 * Provides structured data for Intambwe Media as an East African news organization
 * This improves brand recognition and SEO authority
 */

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    '@id': 'https://intambwemedia.com',
    name: 'Intambwe Media',
    alternateName: 'Amakuru Agezweho',
    url: 'https://intambwemedia.com',
    logo: 'https://intambwemedia.com/logo.png',
    description: 'East African news platform delivering breaking news, investigations, and journalism from Rwanda, Kenya, and Tanzania.',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/intambwemedias',
      'https://facebook.com/intambwemedia',
      'https://instagram.com/intambwemedia',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RW',
      addressRegion: 'Kigali',
      addressLocality: 'Kigali',
    },
    operatingArea: {
      '@type': 'Place',
      name: 'East Africa',
      areaServed: [
        {
          '@type': 'Country',
          name: 'Rwanda',
        },
        {
          '@type': 'Country',
          name: 'Kenya',
        },
        {
          '@type': 'Country',
          name: 'Tanzania',
        },
      ],
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Editorial',
      email: 'editorial@intambwemedia.com',
    },
    knowsAbout: [
      'News',
      'Journalism',
      'Investigations',
      'Breaking News',
      'East Africa',
      'Rwanda',
      'Kenya',
      'Tanzania',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
