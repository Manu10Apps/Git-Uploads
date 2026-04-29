'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Plus, Lock, Unlock } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';
import { ArticleImage } from '@/app/components/ArticleImage';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  author: string;
  publishedAt: string;
  featured: boolean;
  status: string;
  locked?: boolean;
}

export default function AdminArticlesPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [adminRole, setAdminRole] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    const isAdminAuth = localStorage.getItem('adminAuth');
    if (!isAdminAuth) {
      router.push('/admin/login');
    } else {
      setAdminRole(localStorage.getItem('adminRole') || '');
      setAdminName(localStorage.getItem('adminName') || '');
      setAdminEmail(localStorage.getItem('adminEmail') || '');
      setIsLoading(false);
      fetchArticles();
    }
  }, [router]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/articles?includeAll=true&limit=200');
      const data = await response.json();
      setArticles(data.data || []);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-email': adminEmail },
      });
      if (response.ok) {
        setArticles(articles.filter((a) => a.id !== id));
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to delete article');
      }
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  const handleLock = async (id: string, isLocked: boolean) => {
    try {
      const response = await fetch('/api/articles/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          articleId: id,
          action: isLocked ? 'unlock' : 'lock',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setArticles(
          articles.map((a) =>
            a.id === id ? { ...a, locked: result.data.locked } : a
          )
        );
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Failed to lock/unlock article');
      }
    } catch (error) {
      console.error('Failed to lock/unlock article:', error);
      alert('Failed to lock/unlock article');
    }
  };

  const categoryColors: Record<string, string> = {
    technology: 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200',
    business: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200',
    politics: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200',
    health: 'bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-200',
    education: 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200',
    culture: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200',
    sports: 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200',
    investigations: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200',
  };

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
                Manage Articles
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Manage all published articles on the platform
              </p>
            </div>
            <Link
              href="/admin/create-article"
              className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Article
            </Link>
          </div>

          {/* Articles Table */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-neutral-600 dark:text-neutral-400">Loading articles...</p>
            </div>
          ) : articles.length > 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                        Image
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                        Title
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white hidden sm:table-cell">
                        Category
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white hidden md:table-cell">
                        Author
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white hidden lg:table-cell">
                        Published
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white hidden md:table-cell">
                        Featured
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white hidden sm:table-cell">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {articles.map((article) => (
                      <tr
                        key={article.id}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <td className="px-3 sm:px-6 py-4">
                          <div className="w-16 sm:w-20 h-10 sm:h-12 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                            <ArticleImage
                              src={article.image}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="max-w-[120px] sm:max-w-xs">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {article.title}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              categoryColors[article.category] ||
                              'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {article.category}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 hidden md:table-cell">
                          {article.author}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400 hidden lg:table-cell">
                          {article.publishedAt}
                        </td>
                        <td className="px-3 sm:px-6 py-4 hidden md:table-cell">
                          {article.featured ? (
                            <span className="text-xs font-semibold text-red-700 dark:text-amber-400">
                              ★ Featured
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500">-</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                          {article.locked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500">Unlocked</span>
                          )}
                        </td>
                        <td className="px-3 sm:px-6 py-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            {article.locked && (
                              <span className="text-xs font-semibold text-red-700 dark:text-red-400 sm:hidden">🔒</span>
                            )}
                            {(adminRole !== 'editor' || article.author === adminName) && (
                              <button
                                onClick={() => router.push(`/admin/edit-article/${article.id}`)}
                                className="p-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Edit article"
                              >
                                <Edit2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                              </button>
                            )}
                            {adminRole === 'admin' && (
                              <button
                                onClick={() => handleLock(article.id, article.locked || false)}
                                className={`p-2.5 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                  article.locked
                                    ? 'hover:bg-green-50 dark:hover:bg-green-950'
                                    : 'hover:bg-orange-50 dark:hover:bg-orange-950'
                                }`}
                                title={article.locked ? 'Unlock article' : 'Lock article'}
                              >
                                {article.locked ? (
                                  <Unlock className="w-4 h-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Lock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                )}
                              </button>
                            )}
                            {(adminRole !== 'editor' || article.author === adminName) && (
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="p-2.5 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="Delete article"
                              >
                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-12 text-center">
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">No articles yet</p>
              <Link
                href="/admin/create-article"
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Article
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

