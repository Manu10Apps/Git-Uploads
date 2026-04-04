'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ImageIcon, RefreshCcw, ShieldCheck, Wrench, XCircle } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';
import DashboardStats from '@/app/admin/components/DashboardStats';
import { Footer } from '@/app/components';

type FixImagesApiResponse = {
  success: boolean;
  mode?: 'preview' | 'fix';
  totalArticles?: number;
  brokenArticles?: number;
  brokenBefore?: number;
  availableImages?: number;
  fixed?: number;
  failed?: number;
  error?: string;
  broken?: Array<{
    id: number;
    title: string;
    currentImage: string | null;
    reason: string;
    suggestedImage?: string;
  }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('editor');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [lastPreview, setLastPreview] = useState<FixImagesApiResponse | null>(null);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);
  const [isClearCacheLoading, setIsClearCacheLoading] = useState(false);
  const [cacheSuccessMessage, setCacheSuccessMessage] = useState('');
  const [cacheErrorMessage, setCacheErrorMessage] = useState('');
  const [cacheExecutionSummary, setCacheExecutionSummary] = useState<string[]>([]);

  useEffect(() => {
    const isAdminAuth = localStorage.getItem('adminAuth');
    if (!isAdminAuth) {
      router.push('/admin/login');
    } else {
      setAdminName(localStorage.getItem('adminName') || 'Admin');
      setAdminEmail(localStorage.getItem('adminEmail') || '');
      setAdminRole(localStorage.getItem('adminRole') || 'editor');
      setIsLoading(false);
    }
  }, [router]);

  const runImageFixAction = async (mode: 'preview' | 'fix') => {
    if (adminRole !== 'admin') {
      setActionError('Only full admins can run image diagnostics and repair.');
      return;
    }

    if (mode === 'fix') {
      const confirmed = window.confirm(
        'This will update featured image fields for articles with broken paths. Continue?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsActionLoading(true);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch('/api/admin/fix-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
        },
        body: JSON.stringify({ mode }),
      });

      const data = (await response.json()) as FixImagesApiResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Image action failed');
      }

      if (mode === 'preview') {
        setLastPreview(data);
        setActionMessage(
          `Preview complete: ${data.brokenArticles ?? 0} broken of ${data.totalArticles ?? 0} articles.`
        );
      } else {
        setActionMessage(
          `Repair complete: fixed ${data.fixed ?? 0}, failed ${data.failed ?? 0}.`
        );
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Image action failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const clearWebsiteCache = async () => {
    setIsClearCacheLoading(true);
    setCacheErrorMessage('');
    setCacheSuccessMessage('');
    setCacheExecutionSummary([]);

    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
        },
        body: JSON.stringify({ trigger: 'admin-dashboard' }),
      });

      const data = await response.json();
      const summary = Array.isArray(data?.results)
        ? data.results.map((item: { name?: string; status?: string; message?: string }) => `${item.name || 'task'}: ${item.status || 'unknown'} - ${item.message || ''}`)
        : [];

      if (!response.ok && response.status !== 207) {
        throw new Error(data?.message || 'Failed to clear cache');
      }

      if (data?.success) {
        setCacheSuccessMessage(data?.message || 'Website cache cleared successfully.');
      } else {
        setCacheErrorMessage(data?.message || 'Cache clear completed with warnings.');
      }

      setCacheExecutionSummary(summary);
    } catch (error) {
      setCacheErrorMessage(error instanceof Error ? error.message : 'Failed to clear cache');
    } finally {
      setIsClearCacheLoading(false);
      setIsCacheModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
              Welcome back, {adminName}!
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Here's an overview of your content management system
            </p>
          </div>

          {/* Dashboard Stats */}
          <DashboardStats />

          <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-950/30 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
                  <ImageIcon className="w-4 h-4" />
                  Media Recovery
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Featured Image Repair</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Safely preview and repair broken featured image paths for existing articles.
                </p>
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Role: <span className="font-semibold text-neutral-700 dark:text-neutral-200">{adminRole}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => runImageFixAction('preview')}
                disabled={isActionLoading || adminRole !== 'admin'}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="w-4 h-4" />
                {isActionLoading ? 'Working...' : 'Preview Broken Images'}
              </button>
              <button
                type="button"
                onClick={() => runImageFixAction('fix')}
                disabled={isActionLoading || adminRole !== 'admin'}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wrench className="w-4 h-4" />
                {isActionLoading ? 'Applying...' : 'Fix Broken Images'}
              </button>
            </div>

            {actionMessage && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4" />
                {actionMessage}
              </p>
            )}

            {actionError && (
              <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-300">{actionError}</p>
            )}

            {lastPreview && (
              <div className="mt-5 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
                <p className="text-sm text-neutral-700 dark:text-neutral-200 font-semibold">
                  Preview Summary: {lastPreview.brokenArticles ?? 0} broken / {lastPreview.totalArticles ?? 0} total, {lastPreview.availableImages ?? 0} available image files.
                </p>
                {Boolean(lastPreview.broken?.length) && (
                  <ul className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300 max-h-48 overflow-auto pr-1">
                    {lastPreview.broken?.slice(0, 12).map((item) => (
                      <li key={item.id} className="rounded border border-neutral-200 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-neutral-900">
                        <span className="font-semibold">#{item.id}</span> {item.title} ({item.reason})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-300 mb-3">
                  <RefreshCcw className="w-4 h-4" />
                  Infrastructure Control
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Clear Website Cache</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  Revalidate application and route cache, trigger query cache invalidation, and optionally purge CDN cache.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2">
                <ShieldCheck className="w-4 h-4" />
                admin, sub-admin, editor
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => setIsCacheModalOpen(true)}
                disabled={isClearCacheLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCcw className={`w-4 h-4 ${isClearCacheLoading ? 'animate-spin' : ''}`} />
                {isClearCacheLoading ? 'Clearing Cache...' : 'Clear Cache'}
              </button>
            </div>

            {cacheSuccessMessage && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                <CheckCircle2 className="w-4 h-4" />
                {cacheSuccessMessage}
              </p>
            )}

            {cacheErrorMessage && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                <XCircle className="w-4 h-4" />
                {cacheErrorMessage}
              </p>
            )}
          </section>

          {isCacheModalOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4">
              <div className="w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl p-6">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Confirm Cache Clear</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                  This action will clear website caches, revalidate routes, and may trigger optional CDN/query cache purge integrations.
                </p>
                <ul className="mt-3 text-sm text-neutral-700 dark:text-neutral-300 list-disc pl-5 space-y-1">
                  <li>Application cache revalidation</li>
                  <li>Route/view cache refresh</li>
                  <li>Database/query cache purge (if configured)</li>
                  <li>CDN purge (if configured)</li>
                  <li>Cache worker restart webhook (if configured)</li>
                </ul>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCacheModalOpen(false)}
                    disabled={isClearCacheLoading}
                    className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={clearWebsiteCache}
                    disabled={isClearCacheLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                  >
                    <RefreshCcw className={`w-4 h-4 ${isClearCacheLoading ? 'animate-spin' : ''}`} />
                    {isClearCacheLoading ? 'Clearing...' : 'Confirm Clear Cache'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
