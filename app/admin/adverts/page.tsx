'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, Plus, AlertCircle, CheckCircle, Upload, X } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';

interface Advert {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  position: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAdvertsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    imageUrl: '',
    position: 'homepage_top',
  });
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const positions = [
    { value: 'homepage_top', label: 'Homepage Top' },
    { value: 'homepage_bottom', label: 'Homepage Bottom' },
    { value: 'sidebar', label: 'Sidebar' },
    { value: 'article_top', label: 'Article Page Top' },
    { value: 'article_bottom', label: 'Article Page Bottom' },
  ];

  useEffect(() => {
    const isAdminAuth = localStorage.getItem('adminAuth');
    const role = localStorage.getItem('adminRole') || 'editor';
    const email = localStorage.getItem('adminEmail') || '';
    if (!isAdminAuth) {
      router.push('/admin/login');
    } else if (role !== 'admin') {
      setIsForbidden(true);
      setIsLoading(false);
    } else {
      setAdminEmail(email);
      setIsLoading(false);
      fetchAdverts(email);
    }
  }, [router]);

  const fetchAdverts = async (emailOverride?: string) => {
    try {
      setLoading(true);
      const requestEmail = emailOverride ?? adminEmail;
      const response = await fetch('/api/admin/adverts', {
        headers: {
          ...(requestEmail ? { 'x-admin-email': requestEmail } : {}),
        },
      });
      const data = await response.json();
      setAdverts(data.data || []);
    } catch (error) {
      console.error('Failed to fetch adverts:', error);
      setMessage({ type: 'error', text: 'Failed to load adverts' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 10MB' });
      return;
    }

    setUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj,
      });

      const data = await response.json();

      if (data.success) {
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
        setMessage({ type: 'success', text: 'Image uploaded successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleEdit = (advert: Advert) => {
    setEditingId(advert.id);
    setFormData({
      title: advert.title,
      url: advert.url,
      imageUrl: advert.imageUrl,
      position: advert.position,
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    if (!formData.title || !formData.imageUrl) {
      setMessage({ type: 'error', text: 'Please fill in Title and image' });
      return;
    }

    try {
      const response = await fetch('/api/admin/adverts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
        },
        body: JSON.stringify({
          id: editingId,
          ...formData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Advert updated successfully' });
        setEditingId(null);
        fetchAdverts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update advert' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update advert' });
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.imageUrl) {
      setMessage({ type: 'error', text: 'Please fill in Title and upload an image' });
      return;
    }

    try {
      const response = await fetch('/api/admin/adverts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Advert created successfully' });
        setFormData({ title: '', url: '', imageUrl: '', position: 'homepage_top' });
        fetchAdverts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create advert' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create advert' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this advert?')) return;

    try {
      const response = await fetch(`/api/admin/adverts?id=${id}`, {
        method: 'DELETE',
        headers: {
          ...(adminEmail ? { 'x-admin-email': adminEmail } : {}),
        },
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Advert deleted successfully' });
        fetchAdverts();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete advert' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete advert' });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ title: '', url: '', imageUrl: '', position: 'homepage_top' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <>
        <AdminHeader />
        <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Access Restricted</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-5">Only full admins can manage adverts.</p>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="px-5 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
                Advert Manager
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Create and manage advertisements
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <p
                className={`${
                  message.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Form Section */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">
              {editingId ? 'Edit Advert' : 'Create New Advert'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Advert Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter advert title"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {positions.map((pos) => (
                    <option key={pos.value} value={pos.value}>
                      {pos.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Link URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            {/* Image Upload & Preview */}
            <div className="mb-6">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Advert Image</p>
              
              {formData.imageUrl ? (
                <div className="relative">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden aspect-[3/2] flex items-center justify-center border-2 border-dashed" style={{ borderColor: 'rgba(189, 80, 0, 0.4)' }}>
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden aspect-[3/2] flex items-center justify-center border-2 border-dashed cursor-pointer transition-colors ${
                    dragActive ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' : ''
                  }`}
                  style={{ borderColor: dragActive ? '#f59e0b' : 'rgba(189, 80, 0, 0.4)' }}
                >
                  <label className="w-full h-full flex items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="text-center">
                      <Upload className={`w-8 h-8 mx-auto mb-2 ${uploading ? 'text-neutral-400' : 'text-neutral-500'} dark:text-neutral-400`} />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {uploading ? 'Uploading...' : 'Drag & drop image or click to upload'}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">PNG, JPG, GIF (Max 10MB)</p>
                    </div>
                  </label>
                </div>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">Or paste image URL in the field above</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={editingId ? handleSave : handleCreate}
                className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-semibold transition-colors"
              >
                {editingId ? 'Update Advert' : 'Create Advert'}
              </button>
              {editingId && (
                <button
                  onClick={handleCancel}
                  className="px-6 py-2 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Adverts List */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Adverts</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">Loading adverts...</p>
              </div>
            ) : adverts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-neutral-600 dark:text-neutral-400">No adverts yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-900 dark:text-white">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-900 dark:text-white">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-900 dark:text-white">Link</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-900 dark:text-white">Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adverts.map((advert) => (
                      <tr key={advert.id} className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-6 py-4 text-sm text-neutral-900 dark:text-white font-medium">{advert.title}</td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                          {positions.find((p) => p.value === advert.position)?.label || advert.position}
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400 truncate max-w-xs">
                          <a href={advert.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {advert.url}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                          {new Date(advert.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm flex gap-2">
                          <button
                            onClick={() => handleEdit(advert)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(advert.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

