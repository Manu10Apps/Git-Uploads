'use client';

import { useEffect, useState } from 'react';
import { FileText, Eye, TrendingUp, Calendar, Tag } from 'lucide-react';

interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalUsers: number;
  totalCategories: number;
  recentArticles: {
    title: string;
    publishedAt: string;
    category: string;
  }[];
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'sub-admin' | 'editor'>('editor');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const currentRole = (localStorage.getItem('adminRole') || 'editor') as 'admin' | 'sub-admin' | 'editor';
        setRole(currentRole);

        const [articlesRes, categoriesRes] = await Promise.all([
          fetch('/api/articles?includeAll=true&limit=1000'),
          fetch('/api/admin/categories'),
        ]);

        const articlesData = await articlesRes.json();
        const categoriesData = await categoriesRes.json();

        let totalUsers = 0;
        if (currentRole !== 'editor') {
          const usersRes = await fetch('/api/admin/users', {
            headers: {
              'x-admin-email': localStorage.getItem('adminEmail') || '',
            },
          });
          const usersData = await usersRes.json();
          totalUsers = usersData.users?.length || 0;
        }

        const articles = articlesData.data || [];
        const totalArticles = articlesData.pagination?.total || articles.length;
        const published = articles.filter((a: any) => a.status === 'published').length;
        const draft = articles.filter((a: any) => a.status === 'draft').length;

        setStats({
          totalArticles,
          publishedArticles: published,
          draftArticles: draft,
          totalUsers,
          totalCategories: categoriesData.data?.length || 0,
          recentArticles: articles.slice(0, 5).map((a: any) => ({
            title: a.title,
            publishedAt: a.publishedAt,
            category: a.category,
          })),
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600 dark:text-neutral-400">Failed to load dashboard statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Articles',
      value: stats.totalArticles,
      icon: FileText,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Published',
      value: stats.publishedArticles,
      icon: Eye,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Drafts',
      value: stats.draftArticles,
      icon: Calendar,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
    {
      label: 'Categories',
      value: stats.totalCategories,
      icon: Tag,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bgColor} border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 transition-transform hover:scale-105`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {stat.label}
                </p>
                <p className={`text-3xl font-bold mt-2 ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Articles */}
      {stats.recentArticles.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recent Articles
          </h3>
          <div className="space-y-3">
            {stats.recentArticles.map((article, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {article.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {article.publishedAt}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-full">
                      {article.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
        <p className="text-red-100 mb-4">Manage your content efficiently</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/create-article"
            className="px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            New Article
          </a>
          <a
            href="/admin/articles"
            className="px-4 py-2 bg-red-700/50 hover:bg-red-700 transition-colors rounded-lg font-medium"
          >
            View All Articles
          </a>
          {role !== 'editor' && (
            <a
              href="/admin/users"
              className="px-4 py-2 bg-red-700/50 hover:bg-red-700 transition-colors rounded-lg font-medium"
            >
              Manage Users
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
