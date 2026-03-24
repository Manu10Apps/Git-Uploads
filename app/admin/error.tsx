'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import AdminHeader from './components/AdminHeader';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminHeader />
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-600 dark:text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Admin Panel Error
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Something went wrong while processing your request.
          </p>
          
          {error.message && (
            <div className="text-left text-sm text-neutral-600 dark:text-neutral-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-4 rounded-lg mb-6 font-mono">
              <p className="font-semibold mb-2 text-red-800 dark:text-red-300">Error:</p>
              <p className="text-red-700 dark:text-red-400">{error.message}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>

          {error.digest && (
            <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-500 font-mono">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
