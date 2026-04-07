import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <FileQuestion className="w-20 h-20 mx-auto text-neutral-400 dark:text-neutral-600 mb-4" />
              <h1 className="text-6xl font-bold text-neutral-900 dark:text-white mb-2">
                404
              </h1>
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
                Ntabwo Yabonetse
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#667684] hover:bg-[#556270] text-white font-medium rounded-lg transition-colors"
              >
                <Home className="w-5 h-5" />
                Ahabanza
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                <Search className="w-5 h-5" />
                Shakisha
              </Link>
            </div>

            <div className="mt-8">
              <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-4">
                Popular pages:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Link
                  href="/category/amakuru"
                  className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded transition-colors"
                >
                  Amakuru
                </Link>
                <Link
                  href="/category/politiki"
                  className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded transition-colors"
                >
                  Politiki
                </Link>
                <Link
                  href="/category/ubukungu"
                  className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded transition-colors"
                >
                  Ubukungu
                </Link>
                <Link
                  href="/breaking"
                  className="px-3 py-1 text-sm bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded transition-colors"
                >
                  Breaking News
                </Link>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
