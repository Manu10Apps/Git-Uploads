import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentEpaperEdition, getActiveEpaperEditions } from '@/lib/epaper';
import { formatIssueDate } from '@/lib/epaper-client';
import { getTranslation } from '@/lib/translations';
import { FlipbookReader } from '@/app/components/FlipbookReader';
import { Calendar, Archive } from 'lucide-react';

export const metadata = {
  title: 'E-Paper - Weekly Digital Edition | Intambwe Media',
  description: 'Read the latest weekly digital edition of Intambwe Media newspaper.',
};

export default async function EpaperPage() {
  const t = getTranslation('en');
  const currentEdition = await getCurrentEpaperEdition();
  const recentEditions = await getActiveEpaperEditions(10);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900">
      {/* Header Section with Branding */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-900 dark:to-blue-950 text-white py-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          {/* Intambwe Media Logo */}
          <Image
            src="/logo.png"
            alt="Intambwe Media"
            width={80}
            height={80}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">Intambwe Media</h1>
            <p className="text-xl text-blue-100 mt-2">Weekly Digital Edition</p>
            <p className="text-sm text-blue-200 mt-1">Your window to East African news every week</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        {/* Current Issue Section */}
        {currentEdition ? (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
                Latest Issue
              </h2>
              <Link
                href="/epaper/archive"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                <Archive size={18} />
                View Archive
              </Link>
            </div>

            {/* Current Issue Details */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Cover Image or Placeholder */}
                {currentEdition.coverImage ? (
                  <div className="md:w-1/3">
                    <Image
                      src={currentEdition.coverImage}
                      alt={currentEdition.title}
                      width={300}
                      height={400}
                      className="rounded-lg shadow-lg object-cover w-full h-auto"
                    />
                  </div>
                ) : (
                  <div className="md:w-1/3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg flex items-center justify-center" style={{ minHeight: '400px' }}>
                    <div className="text-center text-white">
                      <Calendar size={64} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-semibold opacity-75">E-Paper Edition</p>
                    </div>
                  </div>
                )}

                {/* Issue Info */}
                <div className="md:w-2/3">
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
                    {currentEdition.title}
                  </h3>
                  <div className="space-y-3 text-neutral-700 dark:text-neutral-300 mb-6">
                    <p>
                      <strong>Published:</strong> {formatIssueDate(currentEdition.issueDate)}
                    </p>
                    {currentEdition.pageCount > 0 && (
                      <p>
                        <strong>Pages:</strong> {currentEdition.pageCount}
                      </p>
                    )}
                    {currentEdition.fileSize && (
                      <p>
                        <strong>File Size:</strong> {(currentEdition.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    )}
                    <p>
                      <strong>Created by:</strong> {currentEdition.admin?.name || 'Administrator'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={currentEdition.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Download PDF
                    </Link>
                    <button
                      onClick={() => {
                        // Scroll to reader
                        document.getElementById('epaper-reader')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-6 py-2 border border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition font-medium"
                    >
                      Read Online
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Flipbook Reader */}
            <div id="epaper-reader" className="mb-12">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-6">
                Digital Reader
              </h3>
              <FlipbookReader
                pdfUrl={currentEdition.pdfUrl}
                title={currentEdition.title}
                issueDate={formatIssueDate(currentEdition.issueDate)}
              />
            </div>
          </div>
        ) : (
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-12 text-center mb-12">
            <Calendar size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-xl text-neutral-600 dark:text-neutral-400">
              No E-Paper editions available yet. Check back soon!
            </p>
          </div>
        )}

        {/* Recent Issues Preview */}
        {recentEditions.length > 1 && (
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-6">
              Recent Issues
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEditions.slice(1, 7).map((edition) => (
                <Link
                  key={edition.id}
                  href={`/epaper/${edition.id}`}
                  className="group bg-neutral-50 dark:bg-neutral-800 rounded-lg overflow-hidden hover:shadow-lg transition transform hover:scale-105"
                >
                  {edition.coverImage ? (
                    <Image
                      src={edition.coverImage}
                      alt={edition.title}
                      width={300}
                      height={400}
                      className="w-full h-64 object-cover"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <Calendar size={48} className="text-white opacity-50" />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-neutral-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {edition.title}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formatIssueDate(edition.issueDate)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            About Our E-Paper
          </h2>
          <p className="text-neutral-700 dark:text-neutral-300 mb-4">
            The Intambwe Media E-Paper brings you the week's most important stories in one beautifully designed digital edition.
            Published every week, our curated selection covers the major developments across East Africa and beyond.
          </p>
          <p className="text-neutral-700 dark:text-neutral-300">
            Features:
          </p>
          <ul className="list-disc list-inside text-neutral-700 dark:text-neutral-300 space-y-2 mt-2">
            <li>Interactive digital flipbook reader</li>
            <li>Mobile-responsive design</li>
            <li>Download for offline reading</li>
            <li>Searchable archive of past editions</li>
            <li>Easy sharing on social media</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
