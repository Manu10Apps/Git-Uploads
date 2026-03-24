'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Header, NewsCard, Footer } from '@/app/components';

export default function InvestigationsPage() {
  const router = useRouter();
  const { language } = useAppStore();

  const SAMPLE_ARTICLES = [
    {
      id: '1',
      title: 'Investigation: Corruption in Public Contracts Exposed',
      slug: 'corruption-investigation',
      excerpt: 'A comprehensive investigation reveals systematic corruption in government procurement processes, affecting billions in public funds.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
      category: 'investigations',
      author: 'Sarah Okonkwo',
      publishedAt: '12 hours ago',
      readTime: 12,
      featured: true,
    },
    {
      id: '2',
      title: 'Hidden Deals: Inside the Secret Agreements',
      slug: 'secret-agreements-investigation',
      excerpt: 'Our investigation uncovers secret agreements between government officials and private corporations affecting national resources.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      category: 'investigations',
      author: 'Grace Nkrumah',
      publishedAt: '2 days ago',
      readTime: 15,
      featured: false,
    },
    {
      id: '3',
      title: 'Money Trail: Following Illegal Transactions',
      slug: 'money-trail-investigation',
      excerpt: 'Tracking millions of dollars through shell companies reveals a web of financial corruption spanning multiple countries.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      category: 'investigations',
      author: 'Emmanuel Karamage',
      publishedAt: '3 days ago',
      readTime: 18,
      featured: false,
    },
    {
      id: '4',
      title: 'Environmental Crimes: The Hidden Cost',
      slug: 'environmental-crimes-investigation',
      excerpt: 'Our six-month investigation reveals widespread environmental violations and their devastating impact on local communities.',
      image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80',
      category: 'investigations',
      author: 'Dr. Amina Hassan',
      publishedAt: '1 week ago',
      readTime: 14,
      featured: false,
    },
    {
      id: '5',
      title: 'Labor Exploitation: The Truth Behind the Supply Chain',
      slug: 'labor-exploitation-investigation',
      excerpt: 'An in-depth investigation into labor practices reveals widespread exploitation in major supply chains across the region.',
      image: 'https://images.unsplash.com/photo-1517836357463-d25ddfcf3d77?w=800&q=80',
      category: 'investigations',
      author: 'Kwame Asante',
      publishedAt: '2 weeks ago',
      readTime: 16,
      featured: false,
    },
    {
      id: '6',
      title: 'Land Grab: Powerful Interests Seize Ancestral Lands',
      slug: 'land-grab-investigation',
      excerpt: 'Investigation exposes how connected elites are systematically acquiring ancestral lands from vulnerable communities.',
      image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=800&q=80',
      category: 'investigations',
      author: 'Jean Mutabaruka',
      publishedAt: '3 weeks ago',
      readTime: 20,
      featured: false,
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Investigations Header */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl md:text-2xl font-bold mb-0.5">
              Imyidagaduro - Investigations
            </h1>
            <p className="text-xs text-primary-100">
              In-depth investigative journalism uncovering important stories
            </p>
          </div>
        </section>

        {/* News Grid */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SAMPLE_ARTICLES.map((article) => (
                <article
                  key={article.id}
                  onClick={() => router.push(`/article/${article.slug}`)}
                  className="group border border-neutral-200 dark:border-neutral-800 rounded-sm overflow-hidden bg-white dark:bg-neutral-900 hover:border-red-200 dark:hover:border-red-900/50 transition-colors cursor-pointer hover:shadow-lg"
                >
                  {article.image && (
                    <div className="overflow-hidden bg-neutral-100 dark:bg-neutral-800 h-48">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="text-red-700 dark:text-red-600 text-xs font-semibold tracking-widest mb-2 uppercase">
                      Inkuru icukumbuye
                    </div>
                    <h3 className="text-lg font-serif font-bold text-neutral-900 dark:text-white mb-3 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 font-light">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-500">
                      <span>{article.publishedAt}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

