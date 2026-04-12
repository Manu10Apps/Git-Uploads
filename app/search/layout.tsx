import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Results | Intambwe Media',
  description: 'Search for news articles, investigations, and breaking news from Intambwe Media.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
