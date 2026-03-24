'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Header, NewsCard, Footer } from '@/app/components';

export default function BreakingPage() {
  const router = useRouter();
  const { language } = useAppStore();

  const SAMPLE_ARTICLES = [
    {
      id: '1',
      title: 'Rwanda Launches Digital Transformation Initiative',
      slug: 'rwanda-digital-transformation',
      excerpt: 'The government announces a comprehensive digital transformation program aimed at modernizing key sectors.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
      category: 'breaking',
      author: 'Jean Mutabaruka',
      publishedAt: '2 hours ago',
      readTime: 5,
      featured: true,
    },
    {
      id: '2',
      title: 'Regional Tech Startups Secure $50M in Funding',
      slug: 'regional-startups-funding',
      excerpt: 'East African technology companies receive record investment in Q1 2026, signaling growing investor confidence.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      category: 'breaking',
      author: 'Grace Nkrumah',
      publishedAt: '4 hours ago',
      readTime: 4,
      featured: false,
    },
    {
      id: '3',
      title: 'Elections 2026: Major Parties Present Manifestos',
      slug: 'elections-manifestos',
      excerpt: 'As the election season intensifies, major political parties unveil their policy platforms for economic development.',
      image: 'https://images.unsplash.com/photo-1571675254344-c137d3ebc3b5?w=800&q=80',
      category: 'breaking',
      author: 'Emmanuel Karamage',
      publishedAt: '6 hours ago',
      readTime: 6,
      featured: false,
    },
    {
      id: '4',
      title: 'Climate Change Impacts East African Agriculture',
      slug: 'climate-agriculture',
      excerpt: 'New study reveals how changing weather patterns are affecting crop yields and farming practices across the region.',
      image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80',
      category: 'breaking',
      author: 'Dr. Amina Hassan',
      publishedAt: '8 hours ago',
      readTime: 7,
      featured: false,
    },
    {
      id: '5',
      title: 'East Africa Champions Win Continental Tournament',
      slug: 'continental-tournament',
      excerpt: 'Regional athletes showcase exceptional skills as they dominate the continental championship across multiple disciplines.',
      image: 'https://images.unsplash.com/photo-1517836357463-d25ddfcf3d77?w=800&q=80',
      category: 'breaking',
      author: 'Kwame Asante',
      publishedAt: '10 hours ago',
      readTime: 3,
      featured: false,
    },
    {
      id: '6',
      title: 'Investigation: Corruption in Public Contracts Exposed',
      slug: 'corruption-investigation',
      excerpt: 'A comprehensive investigation reveals systematic corruption in government procurement processes.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
      category: 'breaking',
      author: 'Sarah Okonkwo',
      publishedAt: '12 hours ago',
      readTime: 12,
      featured: false,
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Breaking News Header */}
        <section className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl md:text-2xl font-bold mb-0.5">
              Amakuru - Breaking News
            </h1>
            <p className="text-xs text-primary-100">
              Latest breaking stories from East Africa
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
                      Breaking
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

