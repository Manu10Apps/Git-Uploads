import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getLatestSportsArticles } from '@/lib/homepage-data';

export default async function SportsArticlesRow() {
  const articles = await getLatestSportsArticles(3);

  return (
    <div className="flex flex-col relative" style={{ width: 335, height: 350, overflow: 'hidden' }}>
      {articles.map((article) => (
        <Link
          key={article.slug}
          href={`/article/${article.slug}`}
          className="flex flex-row items-center bg-white rounded shadow hover:shadow-lg transition group mb-3"
          style={{ width: 305, height: 80, overflow: 'hidden' }}
        >
          {article.image && (
            <div style={{ width: 116, height: 80, flexShrink: 0, position: 'relative' }}>
              <Image
                src={article.image}
                alt={article.title}
                width={116}
                height={80}
                style={{ objectFit: 'cover', borderRadius: '4px 0 0 4px' }}
                className="group-hover:scale-105 transition"
                priority
              />
            </div>
          )}
          <div className="pl-3 pr-2 truncate" style={{ width: 189 }}>
            <span className="font-semibold text-sm text-gray-900 group-hover:text-red-600 truncate block">
              {article.title}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
