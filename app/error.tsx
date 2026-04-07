'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertCircle className="w-20 h-20 mx-auto text-red-600 dark:text-red-500 mb-4" />
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Oops! Habayeho Ikibazo
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Something went wrong while loading this page.
              </p>
              {error.message && (
                <p className="text-sm text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg mb-4 font-mono">
                  {error.message}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#667684] hover:bg-[#556270] text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
                Go Home
              </Link>
            </div>

            <div className="mt-8 text-sm text-neutral-500 dark:text-neutral-500">
              <p>If this problem persists, please contact support.</p>
              {error.digest && (
                <p className="mt-2 font-mono">Error ID: {error.digest}</p>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
