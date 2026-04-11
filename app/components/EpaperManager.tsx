'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Download, Trash2, Star, Archive, AlertCircle, FileText, Send, RefreshCw, Pencil, Upload, X, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { formatFileSize, formatIssueDate } from '@/lib/epaper-client';

interface EpaperEdition {
  id: number;
  title: string;
  issueDate: Date;
  coverImage?: string;
  pdfUrl?: string;
  fileSize?: number;
  pageCount: number;
  status: string; // 'draft' | 'published'
  notes?: string;
  isCurrent: boolean;
  isArchived: boolean;
  admin: { name: string };
  createdAt: Date;
}

export function EpaperManager() {
  const [editions, setEditions] = useState<EpaperEdition[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filterArchived, setFilterArchived] = useState(false);
  const [showDrafts, setShowDrafts] = useState(true);
  const [showPublished, setShowPublished] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadIssueDate, setUploadIssueDate] = useState('');
  const [uploadDraft, setUploadDraft] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const xhrRef = React.useRef<XMLHttpRequest | null>(null);

  const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleUnauthorized = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login';
  };

  // Fetch editions
  const fetchEditions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ archived: String(filterArchived) });
      const response = await fetch(`/api/epaper?${params}`);
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

  // Upload new edition via XMLHttpRequest (better timeout/progress for large files)
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadIssueDate) {
      setError('Title and issue date are required');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('issueDate', uploadIssueDate);
    formData.append('isDraft', String(uploadDraft));
    if (uploadFile) formData.append('file', uploadFile);

    const token = localStorage.getItem('adminToken');
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      xhrRef.current = null;
      setUploading(false);
      if (xhr.status === 401) {
        handleUnauthorized();
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText);
        if (data?.success) {
          setSuccessMessage(uploadDraft ? 'Draft created!' : 'Edition uploaded successfully!');
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadTitle('');
          setUploadIssueDate('');
          setUploadDraft(false);
          setUploadProgress(0);
          fetchEditions();
        } else {
          setError(data?.error || `Upload failed (HTTP ${xhr.status})`);
        }
      } catch {
        setError(`Server error (HTTP ${xhr.status}). Please try again.`);
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setUploading(false);
      setError('Network error — check your connection and try again.');
    };

    xhr.ontimeout = () => {
      xhrRef.current = null;
      setUploading(false);
      setError('Upload timed out. Please try again.');
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      setUploading(false);
    };

    xhr.open('POST', '/api/epaper');
    xhr.timeout = 120_000; // 2 minutes
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const handleCancelUpload = () => {
    xhrRef.current?.abort();
    setShowUploadModal(false);
    setUploadProgress(0);
  };

  // Publish a draft
  const handlePublishDraft = async (id: number, file: File | null, publish: boolean) => {
    setPublishingId(id);
    setError(null);
    setSuccessMessage(null);

    try {
      if (file) {
        // Use multipart upload when providing PDF
        const formData = new FormData();
        formData.append('file', file);
        formData.append('publish', String(publish));
        const response = await fetch(`/api/epaper/${id}`, {
          method: 'PUT',
          headers: { ...getAuthHeader() },
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          setSuccessMessage(data.message || 'Draft published!');
          fetchEditions();
        } else {
          setError(data.error || 'Failed to publish draft');
        }
      } else {
        // Publish without new file (draft already has a PDF)
        const response = await fetch(`/api/epaper/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({ status: 'published' }),
        });
        const data = await response.json();
        if (data.success) {
          setSuccessMessage('Draft published successfully!');
          fetchEditions();
        } else {
          setError(data.error || 'Failed to publish');
        }
      }
    } catch (err) {
      setError('Failed to publish draft');
      console.error(err);
    } finally {
      setPublishingId(null);
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
        headers: { ...getAuthHeader() },
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

  const handleUnarchive = async (id: number) => {
    try {
      const response = await fetch(`/api/epaper/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ isArchived: false }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Edition unarchived.');
        fetchEditions();
      } else {
        setError(data.error || 'Failed to unarchive');
      }
    } catch {
      setError('Failed to unarchive edition');
    }
  };

  // Unpublish (revert published → draft)
  const handleUnpublish = async (id: number) => {
    if (!confirm('Unpublish this edition? It will become a draft and disappear from the public site.')) return;
    try {
      const response = await fetch(`/api/epaper/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status: 'draft' }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Edition unpublished (reverted to draft).');
        fetchEditions();
      } else {
        setError(data.error || 'Failed to unpublish');
      }
    } catch {
      setError('Failed to unpublish edition');
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
            Manage and publish weekly digital editions. Drafts are auto-created every Monday.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          <Upload size={16} />
          Upload PDF
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Upload New Edition</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Edition Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  placeholder="e.g. Weekly Edition – April 2026"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Issue Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={uploadIssueDate}
                  onChange={(e) => setUploadIssueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  PDF File
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-neutral-700 dark:text-neutral-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/40 dark:file:text-blue-300 hover:file:bg-blue-100"
                />
                {uploadFile && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{uploadFile.name} ({formatFileSize(uploadFile.size)})</p>
                )}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uploadDraft}
                  onChange={(e) => setUploadDraft(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Save as draft (don&apos;t publish yet)</span>
              </label>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              {uploading && uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    <span>Uploading…</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancelUpload}
                  className="px-4 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition"
                >
                  {uploading ? 'Cancel Upload' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                >
                  {uploading ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block"></span> Uploading…</>
                  ) : (
                    <><Upload size={14} /> {uploadDraft ? 'Save Draft' : 'Upload & Publish'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filterArchived}
            onChange={(e) => setFilterArchived(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Show Archived</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDrafts}
            onChange={(e) => setShowDrafts(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Show Drafts</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showPublished}
            onChange={(e) => setShowPublished(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Show Published</span>
        </label>
        <button
          onClick={fetchEditions}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Editions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-neutral-600 dark:text-neutral-400 mt-4">Loading editions...</p>
        </div>
      ) : editions.length > 0 ? (
        <div className="space-y-4">
          {editions
            .filter((ed) => {
              if (ed.status === 'draft' && !showDrafts) return false;
              if (ed.status === 'published' && !showPublished) return false;
              return true;
            })
            .map((edition) => (
            <div
              key={edition.id}
              className={`bg-white dark:bg-neutral-800 rounded-lg p-4 flex flex-col sm:flex-row gap-4 hover:shadow-lg transition ${edition.status === 'draft' ? 'border-2 border-dashed border-amber-400 dark:border-amber-600' : ''}`}
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
                <div className={`sm:w-32 h-40 sm:h-32 flex-shrink-0 rounded-lg flex items-center justify-center ${edition.status === 'draft' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                  {edition.status === 'draft'
                    ? <FileText size={32} className="text-amber-500 dark:text-amber-400 opacity-80" />
                    : <FileText size={32} className="text-white opacity-50" />
                  }
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
                  <div className="flex gap-2 flex-shrink-0">
                    {edition.status === 'draft' && (
                      <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded">
                        Draft
                      </span>
                    )}
                    {edition.isCurrent && edition.status !== 'draft' && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 text-xs font-semibold rounded">
                        Current Issue
                      </span>
                    )}
                  </div>
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
                  {edition.status === 'draft' && !edition.pdfUrl && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">⚠ PDF not uploaded yet</span>
                  )}
                </div>

                {/* Weekly articles summary for drafts */}
                {edition.status === 'draft' && edition.notes && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline">
                      📰 Last week&apos;s articles ({edition.notes.match(/^\d+/)?.[0] ?? '?'} articles)
                    </summary>
                    <pre className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-sans">
                      {edition.notes}
                    </pre>
                  </details>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {/* Draft: publish directly */}
                  {edition.status === 'draft' && (
                    <button
                      onClick={() => handlePublishDraft(edition.id, null, true)}
                      disabled={publishingId === edition.id}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/60 disabled:opacity-50 transition"
                    >
                      <Send size={14} />
                      {publishingId === edition.id ? 'Publishing...' : 'Publish'}
                    </button>
                  )}

                  {/* Download — only for editions with PDF */}
                  {edition.pdfUrl && (
                    <a
                      href={edition.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                    >
                      <Download size={14} />
                      Download
                    </a>
                  )}

                  {!edition.isCurrent && !filterArchived && edition.status !== 'draft' && (
                    <button
                      onClick={() => handleMarkAsCurrent(edition.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition"
                    >
                      <Star size={14} />
                      Mark as Current
                    </button>
                  )}

                  {edition.status === 'published' && !edition.isArchived && (
                    <button
                      onClick={() => handleUnpublish(edition.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/60 transition"
                    >
                      <EyeOff size={14} />
                      Unpublish
                    </button>
                  )}

                  {edition.isArchived ? (
                    <button
                      onClick={() => handleUnarchive(edition.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded hover:bg-teal-200 dark:hover:bg-teal-900/60 transition"
                    >
                      <Archive size={14} />
                      Unarchive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(edition.id)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-neutral-100 dark:bg-neutral-700 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition"
                    >
                      <Archive size={14} />
                      Archive
                    </button>
                  )}

                  <Link
                    href={`/admin/epaper/edit/${edition.id}`}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/60 transition"
                  >
                    <Pencil size={14} />
                    Edit
                  </Link>

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
