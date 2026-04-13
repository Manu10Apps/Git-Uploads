'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EpaperEdition {
  id: number;
  title: string;
  issueDate: string;
  coverImage?: string | null;
  pdfUrl?: string | null;
  pageCount: number;
  notes?: string | null;
  status: string;
  isCurrent: boolean;
  isArchived: boolean;
  admin: { name: string };
  createdAt: string;
}

export default function EditEpaperPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [edition, setEdition] = useState<EpaperEdition | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [isCurrent, setIsCurrent] = useState(false);

  const getAuthHeader = (): HeadersInit => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    const adminToken = localStorage.getItem('adminToken');
    if (!adminAuth || !adminToken) {
      router.push('/admin/login');
      return;
    }

    const fetchEdition = async () => {
      try {
        const response = await fetch(`/api/epaper/${id}`, {
          headers: { ...getAuthHeader() },
        });
        const data = await response.json();
        if (!data.success) {
          setError(data.error || 'Edition not found');
          setLoading(false);
          return;
        }
        const ed: EpaperEdition = data.data;
        setEdition(ed);
        setTitle(ed.title);
        setIssueDate(new Date(ed.issueDate).toISOString().split('T')[0]);
        setCoverImage(ed.coverImage ?? '');
        setPageCount(ed.pageCount);
        setNotes(ed.notes ?? '');
        setStatus(ed.status);
        setIsCurrent(ed.isCurrent);
      } catch {
        setError('Failed to load edition');
      } finally {
        setLoading(false);
      }
    };

    fetchEdition();
  }, [id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (coverImageFile) {
        // Use multipart form data when uploading a cover image file
        const formData = new FormData();
        formData.append('title', title);
        formData.append('issueDate', issueDate);
        formData.append('coverImage', coverImageFile);
        formData.append('pageCount', String(pageCount));
        formData.append('notes', notes || '');
        formData.append('status', status);
        formData.append('isCurrent', String(isCurrent));

        const response = await fetch(`/api/epaper/${id}`, {
          method: 'PUT',
          headers: { ...getAuthHeader() },
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          setSuccessMessage('Edition updated successfully!');
          setCoverImageFile(null); // Clear the file after successful upload
          setTimeout(() => router.push('/admin/epaper'), 1200);
        } else {
          setError(data.error || 'Failed to update edition');
        }
      } else {
        // Use JSON for metadata-only updates (no file upload)
        const response = await fetch(`/api/epaper/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            title,
            issueDate,
            ...(coverImage && { coverImage }), // Only include if provided
            pageCount,
            notes: notes || null,
            status,
            isCurrent,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setSuccessMessage('Edition updated successfully!');
          setTimeout(() => router.push('/admin/epaper'), 1200);
        } else {
          setError(data.error || 'Failed to update edition');
        }
      }
    } catch {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error || 'Edition not found'}</p>
        <Link href="/admin/epaper" className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft size={16} /> Back to E-Paper Manager
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/epaper"
          className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Edit Edition</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-neutral-800 rounded-lg p-6 space-y-5 shadow-sm">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Edition Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Issue Date */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Issue Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Cover Image
          </label>
          {coverImage && !coverImageFile && (
            <div className="mb-3 p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">Current cover image:</p>
              <img src={coverImage} alt="Current cover" className="w-24 h-32 object-cover rounded" />
              <button
                type="button"
                onClick={() => setCoverImage('')}
                className="mt-2 text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200"
              >
                Remove Cover Image
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-neutral-700 dark:text-neutral-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 dark:file:bg-green-900/40 dark:file:text-green-300 hover:file:bg-green-100"
          />
          {coverImageFile && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              ✓ New image selected: {coverImageFile.name}
            </p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Supported formats: JPEG, PNG, WebP (max 5MB)
          </p>
        </div>

        {/* Page Count */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Page Count
          </label>
          <input
            type="number"
            min={0}
            value={pageCount}
            onChange={(e) => setPageCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Mark as Current */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isCurrent"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600"
          />
          <label htmlFor="isCurrent" className="text-sm text-neutral-700 dark:text-neutral-300">
            Mark as current issue
          </label>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Notes / Article Summary
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
          />
        </div>

        {/* PDF info (read-only display) */}
        {edition.pdfUrl && (
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">PDF:</span>{' '}
            <a
              href={edition.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {edition.pdfUrl}
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2">
          <Link
            href="/admin/epaper"
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
