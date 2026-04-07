'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertTriangle className="w-24 h-24 mx-auto text-amber-600 dark:text-amber-500 mb-4" />
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-2">
                System Error
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                A critical error occurred. This has been logged and we'll look into it.
              </p>
              {error.message && (
                <div className="text-left text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 p-4 rounded-lg mb-4 font-mono overflow-auto max-h-40">
                  <p className="font-semibold mb-2">Error Details:</p>
                  <p className="text-red-600 dark:text-red-400">{error.message}</p>
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f61f00] hover:bg-[#556270] text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Reload Application
            </button>

            {error.digest && (
              <div className="mt-6 text-sm text-neutral-500 dark:text-neutral-500">
                <p className="font-mono">Error ID: {error.digest}</p>
                <p className="mt-2">Please include this ID when reporting the issue.</p>
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
