export interface NavCategoryItem {
  key: string;
  href: string;
  slug?: string;
}

export const NAV_CATEGORY_ITEMS: NavCategoryItem[] = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.epaper', href: '/epaper', slug: 'epaper' },
  { key: 'nav.news', href: '/category/amakuru', slug: 'amakuru' },
  { key: 'nav.politics', href: '/category/politiki', slug: 'politiki' },
  { key: 'nav.health', href: '/category/ubuzima', slug: 'ubuzima' },
  { key: 'nav.education', href: '/category/uburezi', slug: 'uburezi' },
  { key: 'nav.business', href: '/category/ubukungu', slug: 'ubukungu' },
  { key: 'nav.sports', href: '/category/siporo', slug: 'siporo' },
  { key: 'nav.technology', href: '/category/ikoranabuhanga', slug: 'ikoranabuhanga' },
  { key: 'nav.entertainment', href: '/category/imyidagaduro', slug: 'imyidagaduro' },
  { key: 'nav.justice', href: '/category/ubutabera', slug: 'ubutabera' },
  { key: 'nav.environment', href: '/category/ibidukikije', slug: 'ibidukikije' },
  { key: 'nav.faith', href: '/category/imyemerere', slug: 'imyemerere' },
  { key: 'nav.eastAfrica', href: '/category/afurika-yiburasirazuba', slug: 'afurika-yiburasirazuba' },
  { key: 'nav.international', href: '/category/mu-mahanga', slug: 'mu-mahanga' },
];

export const NAV_CATEGORY_SLUGS = NAV_CATEGORY_ITEMS
  .map((item) => item.slug)
  .filter((slug): slug is string => Boolean(slug));
