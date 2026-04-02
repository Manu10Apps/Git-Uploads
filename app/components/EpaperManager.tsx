'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, Download, Trash2, Star, Archive, AlertCircle } from 'lucide-react';
import { formatFileSize, formatIssueDate } from '@/lib/epaper-client';

interface EpaperEdition {
  id: number;
  title: string;
  issueDate: Date;
  coverImage?: string;
  pdfUrl: string;
  fileSize?: number;
  pageCount: number;
  isCurrent: boolean;
  isArchived: boolean;
  admin: { name: string };
  createdAt: Date;
}

export function EpaperManager() {
  const [editions, setEditions] = useState<EpaperEdition[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);

  const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch editions
  const fetchEditions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/epaper?archived=${filterArchived}`);
      const data = await response.json();
      if (data.success) {
        setEditions(data.data);
      } else {
        setError(data.error || 'Failed to fetch editions');
      }
    } catch (err) {
      setError('Failed to fetch editions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterArchived]);

  React.useEffect(() => {
    fetchEditions();
  }, [fetchEditions]);

  // Upload handler
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/epaper', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Edition uploaded successfully!');
        setShowUploadForm(false);
        e.currentTarget.reset();
        fetchEditions();
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Mark as current
  const handleMarkAsCurrent = async (id: number) => {
    try {
      const response = await fetch(`/api/epaper/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ isCurrent: true }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Marked as current issue!');
        fetchEditions();
      } else {
        setError(data.error || 'Failed to update');
      }
    } catch (err) {
      setError('Failed to update edition');
    }
  };

  // Archive
  const handleArchive = async (id: number) => {
    if (!confirm('Archive this edition?')) return;
    try {
      const response = await fetch(`/api/epaper/${id}?hard=false`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Edition archived!');
        fetchEditions();
      } else {
        setError(data.error || 'Failed to archive');
      }
    } catch (err) {
      setError('Failed to archive edition');
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm('Permanently delete this edition? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/epaper/${id}?hard=true`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeader(),
        },
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Edition permanently deleted!');
        fetchEditions();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete edition');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">E-Paper Manager</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and publish weekly digital editions
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Upload size={18} />
          Upload Edition
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="flex gap-3 px-4 py-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-300">{successMessage}</p>
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Edition Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g., Weekly Edition - March 2, 2026"
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Issue Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              name="issueDate"
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              PDF File <span className="text-red-600">*</span>
            </label>
            <input
              type="file"
              name="file"
              accept=".pdf"
              required
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Only PDF files allowed. Maximum 50MB recommended.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Cover Image URL (Optional)
            </label>
            <input
              type="url"
              name="coverImage"
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {uploading ? 'Uploading...' : 'Upload Edition'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filterArchived}
            onChange={(e) => setFilterArchived(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Show Archived</span>
        </label>
      </div>

      {/* Editions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-neutral-600 dark:text-neutral-400 mt-4">Loading editions...</p>
        </div>
      ) : editions.length > 0 ? (
        <div className="space-y-4">
          {editions.map((edition) => (
            <div
              key={edition.id}
              className="bg-white dark:bg-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row gap-4 hover:shadow-lg transition"
            >
              {/* Cover Thumbnail */}
              {edition.coverImage ? (
                <div className="sm:w-32 h-40 sm:h-32 flex-shrink-0">
                  <Image
                    src={edition.coverImage}
                    alt={edition.title}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              ) : (
                <div className="sm:w-32 h-40 sm:h-32 flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <Upload size={32} className="text-white opacity-50" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{edition.title}</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formatIssueDate(new Date(edition.issueDate))}
                    </p>
                  </div>
                  {edition.isCurrent && (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded">
                      Current Issue
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                  {edition.fileSize && (
                    <span>📦 {formatFileSize(edition.fileSize)}</span>
                  )}
                  {edition.pageCount > 0 && (
                    <span>📄 {edition.pageCount} pages</span>
                  )}
                  <span>👤 {edition.admin.name}</span>
                  <span>📅 {new Date(edition.createdAt).toLocaleDateString()}</span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <a
                    href={edition.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                  >
                    <Download size={14} />
                    Download
                  </a>

                  {!edition.isCurrent && !filterArchived && (
                    <button
                      onClick={() => handleMarkAsCurrent(edition.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition"
                    >
                      <Star size={14} />
                      Mark as Current
                    </button>
                  )}

                  {!edition.isArchived && (
                    <button
                      onClick={() => handleArchive(edition.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(edition.id)}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/60 transition"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-12 text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            {filterArchived
              ? 'No archived editions found'
              : 'No editions yet. Upload the first weekly edition!'}
          </p>
        </div>
      )}
    </div>
  );
}
