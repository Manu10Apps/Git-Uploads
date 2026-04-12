import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatIssueDate } from '@/lib/epaper-client';
import { FlipbookReader } from '@/app/components/FlipbookReader';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: RouteParams) {
  const resolvedParams = await params;
  const edition = await prisma.epaperEdition.findUnique({
    where: { id: parseInt(resolvedParams.id) },
  });

  if (!edition) return { title: 'Edition not found' };

  return {
    title: `${edition.title} | Intambwe Media E-Paper`,
    description: `Read the E-Paper edition from ${formatIssueDate(edition.issueDate)}`,
  };
}

export default async function EpaperEditionPage({ params }: RouteParams) {
  const resolvedParams = await params;
  const edition = await prisma.epaperEdition.findUnique({
    where: { id: parseInt(resolvedParams.id) },
    include: { admin: { select: { name: true } } },
  });

  if (!edition) {
    notFound();
  }

  // Drafts and editions without a PDF are not publicly viewable
  if (!edition.pdfUrl || edition.status !== 'published') {
    notFound();
  }
  const [previousEdition, nextEdition] = await Promise.all([
    prisma.epaperEdition.findFirst({
      where: {
        issueDate: { lt: edition.issueDate },
        isArchived: false,
      },
      orderBy: { issueDate: 'desc' },
      select: { id: true, title: true, issueDate: true },
    }),
    prisma.epaperEdition.findFirst({
      where: {
        issueDate: { gt: edition.issueDate },
        isArchived: false,
      },
      orderBy: { issueDate: 'asc' },
      select: { id: true, title: true, issueDate: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Header Navigation */}
      <div className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/epaper"
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition"
              >
                <ChevronLeft size={20} />
                Back
              </Link>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-white">{edition.title}</h1>
                <p className="text-xs text-neutral-400">{formatIssueDate(edition.issueDate)}</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex gap-2">
              {previousEdition ? (
                <Link
                  href={`/epaper/${previousEdition.id}`}
                  title={previousEdition.title}
                  className="px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded transition"
                >
                  ← Previous
                </Link>
              ) : (
                <button
                  disabled
                  className="px-3 py-2 text-sm bg-neutral-800 text-neutral-600 rounded opacity-50 cursor-not-allowed"
                >
                  ← Previous
                </button>
              )}

              {nextEdition ? (
                <Link
                  href={`/epaper/${nextEdition.id}`}
                  title={nextEdition.title}
                  className="px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded transition"
                >
                  Next →
                </Link>
              ) : (
                <button
                  disabled
                  className="px-3 py-2 text-sm bg-neutral-800 text-neutral-600 rounded opacity-50 cursor-not-allowed"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-neutral-950 py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <FlipbookReader
            pdfUrl={edition.pdfUrl!}
            title={edition.title}
            issueDate={formatIssueDate(edition.issueDate)}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-neutral-900 border-t border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-2">Edition Information</h3>
              <dl className="space-y-2 text-sm text-neutral-400">
                <div>
                  <dt className="font-medium text-neutral-300">Title:</dt>
                  <dd>{edition.title}</dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-300">Published:</dt>
                  <dd>{formatIssueDate(edition.issueDate)}</dd>
                </div>
                {edition.pageCount > 0 && (
                  <div>
                    <dt className="font-medium text-neutral-300">Pages:</dt>
                    <dd>{edition.pageCount}</dd>
                  </div>
                )}
                {edition.fileSize && (
                  <div>
                    <dt className="font-medium text-neutral-300">File Size:</dt>
                    <dd>{(edition.fileSize / (1024 * 1024)).toFixed(2)} MB</dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Creator</h3>
              <p className="text-sm text-neutral-400">{edition.admin?.name || 'Administrator'}</p>
              <p className="text-xs text-neutral-500 mt-2">Created on {new Date(edition.createdAt).toLocaleDateString()}</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">Actions</h3>
              <div className="space-y-2">
                <a
                  href={edition.pdfUrl!}
                  download={`${edition.title}.pdf`}
                  className="block text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-center"
                >
                  Download PDF
                </a>
                <Link
                  href="/epaper/archive"
                  className="block text-sm px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded transition text-center"
                >
                  View Archive
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
