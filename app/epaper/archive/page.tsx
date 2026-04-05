import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatIssueDate } from '@/lib/epaper-client';
import { Calendar, Download } from 'lucide-react';

export const metadata = {
  title: 'E-Paper Archive | Intambwe Media',
  description: 'Browse and read past editions of the Intambwe Media weekly digital newspaper.',
};

interface RouteParams {
  searchParams: Promise<{
    page?: string;
    sort?: 'newest' | 'oldest';
  }>;
}

export default async function EpaperArchivePage({ searchParams }: RouteParams) {
  const resolvedSearchParams = await searchParams;
  const currentPage = parseInt(resolvedSearchParams.page || '1');
  const sort = (resolvedSearchParams.sort || 'newest') as 'newest' | 'oldest';
  const itemsPerPage = 12;
  const skip = (currentPage - 1) * itemsPerPage;

  // Fetch editions
  const [editions, totalCount] = await Promise.all([
    prisma.epaperEdition.findMany({
      where: { isArchived: false },
      orderBy: { issueDate: sort === 'newest' ? 'desc' : 'asc' },
      skip,
      take: itemsPerPage,
      include: { admin: { select: { name: true } } },
    }),
    prisma.epaperEdition.count({ where: { isArchived: false } }),
  ]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-900 dark:to-blue-950 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/epaper" className="text-blue-100 hover:text-white mb-4 inline-flex items-center gap-2">
            ← Back to Latest Edition
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold">E-Paper Archive</h1>
          <p className="text-xl text-blue-100 mt-2">Browse all our published weekly editions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-neutral-600 dark:text-neutral-400">
              Showing <strong>{skip + 1}</strong> to <strong>{Math.min(skip + itemsPerPage, totalCount)}</strong> of{' '}
              <strong>{totalCount}</strong> editions
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Sort:</span>
            <Link
              href="/epaper/archive?page=1&sort=newest"
              className={`px-3 py-2 rounded-lg border ${
                sort === 'newest'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Newest First
            </Link>
            <Link
              href="/epaper/archive?page=1&sort=oldest"
              className={`px-3 py-2 rounded-lg border ${
                sort === 'oldest'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              Oldest First
            </Link>
          </div>
        </div>

        {/* Grid */}
        {editions.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {editions.map((edition) => (
                <div
                  key={edition.id}
                  className="group bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition"
                >
                  {/* Cover Image */}
                  {edition.coverImage ? (
                    <Image
                      src={edition.coverImage}
                      alt={edition.title}
                      width={300}
                      height={400}
                      className="w-full h-64 object-cover group-hover:opacity-90 transition"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Calendar size={48} className="text-white opacity-50" />
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-2 line-clamp-2">
                      {edition.title}
                    </h3>

                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                      <Calendar size={14} className="inline mr-1" />
                      {formatIssueDate(edition.issueDate)}
                    </p>

                    {edition.admin && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-4">
                        Created by: {edition.admin.name}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <Link
                        href={`/epaper/${edition.id}`}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition text-center"
                      >
                        Read
                      </Link>
                      {edition.pdfUrl && (
                      <a
                        href={edition.pdfUrl}
                        download
                        className="px-3 py-2 border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 text-sm font-medium rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                        title="Download PDF"
                      >
                        <Download size={16} />
                      </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <Link
                  href={`/epaper/archive?page=${Math.max(1, currentPage - 1)}&sort=${sort}`}
                  className={`px-4 py-2 rounded-lg border transition ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed'
                      : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  aria-disabled={currentPage === 1}
                >
                  Previous
                </Link>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Link
                    key={page}
                    href={`/epaper/archive?page=${page}&sort=${sort}`}
                    className={`px-3 py-2 rounded-lg border transition ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {page}
                  </Link>
                ))}

                <Link
                  href={`/epaper/archive?page=${Math.min(totalPages, currentPage + 1)}&sort=${sort}`}
                  className={`px-4 py-2 rounded-lg border transition ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed'
                      : 'border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  aria-disabled={currentPage === totalPages}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-12 text-center">
            <Calendar size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-xl text-neutral-600 dark:text-neutral-400">
              No E-Paper editions available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
