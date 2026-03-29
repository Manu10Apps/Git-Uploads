'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/app/admin/components/AdminHeader';
import DashboardStats from '@/app/admin/components/DashboardStats';
import { Footer } from '@/app/components';

type ImageFixApiResponse = {
  success?: boolean;
  mode?: string;
  error?: string;
  message?: string;
  totalArticles?: number;
  brokenArticles?: number;
  availableImages?: number;
  fixed?: number;
  failed?: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('editor');
  const [isImageActionRunning, setIsImageActionRunning] = useState(false);
  const [imageActionStatus, setImageActionStatus] = useState('');
  const [imageActionSummary, setImageActionSummary] = useState<ImageFixApiResponse | null>(null);

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

  const runImageRecovery = async (mode: 'preview' | 'fix') => {
    if (!adminEmail) {
      setImageActionStatus('Missing admin identity. Please log in again.');
      return;
    }

    if (adminRole !== 'admin') {
      setImageActionStatus('Only admin users can run image recovery.');
      return;
    }

    const confirmationMessage =
      mode === 'fix'
        ? 'Run LIVE image repair now? This will update article featured image values in the database.'
        : 'Run preview scan for broken featured images now?';

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setIsImageActionRunning(true);
      setImageActionStatus(mode === 'fix' ? 'Running image repair...' : 'Scanning featured images...');

      const response = await fetch('/api/admin/fix-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({ mode }),
      });

      const payload = (await response.json().catch(() => ({}))) as ImageFixApiResponse;
      if (!response.ok || payload.success === false) {
        setImageActionSummary(payload);
        setImageActionStatus(payload.error || payload.message || 'Image recovery request failed.');
        return;
      }

      setImageActionSummary(payload);
      if (mode === 'preview') {
        setImageActionStatus(
          `Preview complete: ${payload.brokenArticles ?? 0} broken of ${payload.totalArticles ?? 0} articles.`
        );
      } else {
        setImageActionStatus(
          `Fix complete: ${payload.fixed ?? 0} updated, ${payload.failed ?? 0} failed.`
        );
      }
    } catch {
      setImageActionStatus('Network error while running image recovery.');
    } finally {
      setIsImageActionRunning(false);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

          <section className="mt-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  Featured Image Recovery
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  One-click tool to preview or repair broken featured image references.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runImageRecovery('preview')}
                  disabled={isImageActionRunning || adminRole !== 'admin'}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview Broken Images
                </button>
                <button
                  type="button"
                  onClick={() => runImageRecovery('fix')}
                  disabled={isImageActionRunning || adminRole !== 'admin'}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Fix Now
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {adminRole !== 'admin' && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Admin role required to run recovery actions.
                </p>
              )}

              {imageActionStatus && (
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{imageActionStatus}</p>
              )}

              {imageActionSummary && (
                <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3">
                  <div>Mode: {imageActionSummary.mode || 'unknown'}</div>
                  <div>Total Articles: {imageActionSummary.totalArticles ?? '-'}</div>
                  <div>Broken Articles: {imageActionSummary.brokenArticles ?? '-'}</div>
                  <div>Available Images: {imageActionSummary.availableImages ?? '-'}</div>
                  <div>Fixed: {imageActionSummary.fixed ?? '-'}</div>
                  <div>Failed: {imageActionSummary.failed ?? '-'}</div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
