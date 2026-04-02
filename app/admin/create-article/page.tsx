'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header, Footer, CategorySelect } from '@/app/components';
import { AlertCircle, CheckCircle, Upload, X, Lock } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';
import ContentEditor from '@/app/admin/components/ContentEditor';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { NAV_CATEGORY_SLUGS } from '@/lib/nav-categories';
import { ArticleImage } from '@/app/components/ArticleImage';

const FALLBACK_ARTICLE_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#e5e5e5"/><rect x="80" y="80" width="1040" height="515" rx="24" fill="#d4d4d4"/><circle cx="300" cy="250" r="68" fill="#bdbdbd"/><path d="M180 515l215-195 145 130 185-170 295 235H180z" fill="#a3a3a3"/><text x="600" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" fill="#525252">Intambwe Media</text></svg>')}`;

interface ArticleForm {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  authorSocialPlatform: string;
  authorSocialUrl: string;
  authorSocialPlatform2: string;
  authorSocialUrl2: string;
  image: string;
  tags: string;
  readTime: number;
  featured: boolean;
  gallery: Array<{ url: string; caption: string }>;
}

type ArticleStatus = 'published' | 'draft' | 'archived';

export default function CreateArticlePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminAuth, setIsAdminAuth] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [form, setForm] = useState<ArticleForm>({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    author: '',
    authorSocialPlatform: '',
    authorSocialUrl: '',
    authorSocialPlatform2: '',
    authorSocialUrl2: '',
    image: '',
    tags: '',
    readTime: 5,
    featured: false,
    gallery: [],
  });

  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    if (!auth) {
      router.push('/admin/login');
    } else {
      setIsAdminAuth(auth);
      setAdminRole(localStorage.getItem('adminRole') || '');
      setAdminEmail(localStorage.getItem('adminEmail') || '');
      setIsLoading(false);
    }
  }, [router]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [degradedNotice, setDegradedNotice] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ name: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState('');
  const galleryFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);
  const [socialProfile, setSocialProfile] = useState<{ socialLocked: boolean; socialLinks: Record<string, string> } | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);

  const isSocialLocked = Boolean(socialProfile?.socialLocked);
  const canManageSocialLock = adminRole === 'admin';
  const socialInputsDisabled = isSocialLocked && !canManageSocialLock;

  const syncAuthorSocialProfile = async (authorNameRaw?: string) => {
    const authorName = (authorNameRaw || form.author || '').trim();
    if (!authorName || !adminEmail) {
      setSocialProfile(null);
      return;
    }

    setSocialLoading(true);
    try {
      const response = await fetch(`/api/admin/authors/social?author=${encodeURIComponent(authorName)}`, {
        headers: {
          'x-admin-email': adminEmail,
        },
      });
      const data = await response.json();

      if (!response.ok || !data?.success) {
        setSocialProfile(null);
        return;
      }

      const profile = data?.data || null;
      setSocialProfile(profile);

      if (profile?.socialLinks) {
        const entries = Object.entries(profile.socialLinks as Record<string, string>);
        const first = entries[0] || ['', ''];
        const second = entries[1] || ['', ''];
        setForm((prev) => ({
          ...prev,
          authorSocialPlatform: String(first[0] || ''),
          authorSocialUrl: String(first[1] || ''),
          authorSocialPlatform2: String(second[0] || ''),
          authorSocialUrl2: String(second[1] || ''),
        }));
      }
    } catch {
      setSocialProfile(null);
    } finally {
      setSocialLoading(false);
    }
  };

  const requestSocialChange = async () => {
    if (!form.author.trim()) {
      setMessage({ type: 'error', text: 'Please enter the author name first' });
      return;
    }

    const response = await fetch('/api/admin/authors/social/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail,
      },
      body: JSON.stringify({
        authorName: form.author.trim(),
        authorSocialPlatform: form.authorSocialPlatform,
        authorSocialUrl: form.authorSocialUrl,
        authorSocialPlatform2: form.authorSocialPlatform2,
        authorSocialUrl2: form.authorSocialUrl2,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data?.success) {
      setMessage({ type: 'error', text: data?.error || 'Failed to submit change request' });
      return;
    }

    setMessage({ type: 'success', text: 'Change request sent to admin for approval' });
  };

  const unlockOrRelockSocial = async (action: 'unlock' | 'relock') => {
    const response = await fetch('/api/admin/authors/social', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail,
      },
      body: JSON.stringify({
        authorName: form.author.trim(),
        action,
        unlockMinutes: 15,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.success) {
      setMessage({ type: 'error', text: data?.error || 'Failed to change lock state' });
      return;
    }
    setMessage({ type: 'success', text: action === 'unlock' ? 'Social fields unlocked for update' : 'Social fields relocked' });
    await syncAuthorSocialProfile(form.author);
  };



  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 10MB' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedImage({ name: file.name, url: data.url });
        setForm((prev) => ({ ...prev, image: data.url }));
        setMessage({ type: 'success', text: 'Featured image uploaded successfully!' });
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

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const submitArticle = async (status: ArticleStatus) => {
    setLoading(true);
    setMessage(null);

    // Validate required fields
    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Please enter an article title' });
      setLoading(false);
      return;
    }

    if (!form.excerpt.trim()) {
      setMessage({ type: 'error', text: 'Please enter an article excerpt' });
      setLoading(false);
      return;
    }

    if (!form.content.trim()) {
      setMessage({ type: 'error', text: 'Please enter article content' });
      setLoading(false);
      return;
    }

    if (!form.category) {
      setMessage({ type: 'error', text: 'Please select a category' });
      setLoading(false);
      return;
    }

    if (!form.author.trim()) {
      setMessage({ type: 'error', text: 'Please enter the author name' });
      setLoading(false);
      return;
    }

    if (!form.image || !form.image.trim()) {
      setMessage({ type: 'error', text: 'Please upload a featured image for this article' });
      setLoading(false);
      return;
    }

    try {
      const tagArray = form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');

      const categoryId = parseInt(form.category);
      if (isNaN(categoryId)) {
        setMessage({ type: 'error', text: 'Invalid category selected' });
        setLoading(false);
        return;
      }

      const normalizedFeaturedImage = normalizeArticleImageUrl(form.image);

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          category_id: categoryId,
          author: form.author.trim(),
          authorSocialPlatform: form.authorSocialPlatform || null,
          authorSocialUrl: form.authorSocialUrl.trim() || null,
          authorSocialPlatform2: form.authorSocialPlatform2 || null,
          authorSocialUrl2: form.authorSocialUrl2.trim() || null,
          image: normalizedFeaturedImage,
          tags: tagArray,
          readTime: parseInt(form.readTime.toString()) || 5,
          featured: form.featured,
          gallery: form.gallery,
          status,
        }),
      });

      const data = await response.json();
      setDegradedNotice(data?.degraded ? (data.message || 'Database is unavailable. You are currently using fallback storage.') : null);

      if (response.ok && data.success) {
        const successMessage =
          status === 'published'
            ? 'Article published successfully!'
            : status === 'draft'
              ? 'Draft saved successfully!'
              : 'Article saved as unpublished successfully!';

        setMessage({ type: 'success', text: successMessage });
        setForm({
          title: '',
          excerpt: '',
          content: '',
          category: '',
          author: '',
          authorSocialPlatform: '',
          authorSocialUrl: '',
          authorSocialPlatform2: '',
          authorSocialUrl2: '',
          image: '',
          tags: '',
          readTime: 5,
          featured: false,
          gallery: [],
        });
        // Redirect to admin dashboard after 2 seconds
        setTimeout(() => {
          router.push('/admin/articles');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to publish article' });
      }
    } catch (error) {
      console.error('Article creation error:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitArticle('published');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
              Create New Article
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Publish a new article to the Amakuru platform
            </p>
          </div>

          {degradedNotice && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {degradedNotice}
            </div>
          )}

          {/* Messages */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Article Title *
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Enter article headline"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                required
              />
            </div>

            {/* Author */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Author Name *
              </label>
              <input
                type="text"
                name="author"
                value={form.author}
                onChange={handleChange}
                onBlur={() => {
                  void syncAuthorSocialProfile(form.author);
                }}
                placeholder="Enter author name"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Preferred Social Media 1
                </label>
                <select
                  name="authorSocialPlatform"
                  value={form.authorSocialPlatform}
                  onChange={handleChange}
                  disabled={socialInputsDisabled}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                >
                  <option value="">No contact platform</option>
                  <option value="x" disabled={form.authorSocialPlatform2 === 'x'}>X (Twitter)</option>
                  <option value="facebook" disabled={form.authorSocialPlatform2 === 'facebook'}>Facebook</option>
                  <option value="linkedin" disabled={form.authorSocialPlatform2 === 'linkedin'}>LinkedIn</option>
                  <option value="instagram" disabled={form.authorSocialPlatform2 === 'instagram'}>Instagram</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Social Profile URL 1
                </label>
                <input
                  type="url"
                  name="authorSocialUrl"
                  value={form.authorSocialUrl}
                  onChange={handleChange}
                  disabled={socialInputsDisabled}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Preferred Social Media 2
                </label>
                <select
                  name="authorSocialPlatform2"
                  value={form.authorSocialPlatform2}
                  onChange={handleChange}
                  disabled={socialInputsDisabled}
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                >
                  <option value="">No second platform</option>
                  <option value="x" disabled={form.authorSocialPlatform === 'x'}>X (Twitter)</option>
                  <option value="facebook" disabled={form.authorSocialPlatform === 'facebook'}>Facebook</option>
                  <option value="linkedin" disabled={form.authorSocialPlatform === 'linkedin'}>LinkedIn</option>
                  <option value="instagram" disabled={form.authorSocialPlatform === 'instagram'}>Instagram</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Social Profile URL 2
                </label>
                <input
                  type="url"
                  name="authorSocialUrl2"
                  value={form.authorSocialUrl2}
                  onChange={handleChange}
                  disabled={socialInputsDisabled}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-900/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Lock className="w-4 h-4" />
                  <span>
                    {socialLoading
                      ? 'Checking social profile lock...'
                      : isSocialLocked
                        ? 'Social links are locked'
                        : 'Social links are editable'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSocialLocked && !canManageSocialLock && (
                    <button
                      type="button"
                      onClick={() => void requestSocialChange()}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Request Social Media Change
                    </button>
                  )}
                  {canManageSocialLock && (
                    <button
                      type="button"
                      onClick={() => void unlockOrRelockSocial(isSocialLocked ? 'unlock' : 'relock')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-700 hover:bg-red-800 text-white"
                    >
                      {isSocialLocked ? 'Unlock 15m' : 'Relock'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Excerpt */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Excerpt / Summary *
              </label>
              <textarea
                name="excerpt"
                value={form.excerpt}
                onChange={handleChange}
                placeholder="Brief summary of the article (appears in listings)"
                rows={3}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                required
              />
            </div>

            {/* Content */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Article Content *
              </label>
              <ContentEditor
                value={form.content}
                onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
                name="content"
                placeholder="Full article content"
                rows={10}
                focusRingClassName="focus:ring-2 focus:ring-red-700"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Category *
              </label>
              <CategorySelect
                value={form.category}
                onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
                placeholder="Select a category"
                includeAll
                preferredSlugs={NAV_CATEGORY_SLUGS}
                required
              />
            </div>

            {/* Featured Image */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Featured Image
              </label>

              {/* Image Preview */}
              {form.image && (
                <div className="mb-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <ArticleImage
                    src={normalizeArticleImageUrl(form.image) ?? FALLBACK_ARTICLE_IMAGE}
                    alt="Featured image preview"
                    fallbackSrc={FALLBACK_ARTICLE_IMAGE}
                    className="w-full h-52 object-cover"
                  />
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-950 border-t border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <p className="text-xs font-medium text-green-800 dark:text-green-200 truncate">
                        {uploadedImage ? uploadedImage.name : form.image}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setForm((prev) => ({ ...prev, image: '' }));
                      }}
                      className="ml-2 p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Section */}
              <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-amber-500 dark:hover:border-amber-500 transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Click to upload
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

            </div>

            {/* Gallery Images */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Gallery Images (with captions)
              </label>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
                Add additional images to display as a gallery within the article
              </p>

              {/* Gallery Items Display */}
              {form.gallery.length > 0 && (
                <div className="mb-6 space-y-3">
                  {form.gallery.map((item, index) => (
                    <div
                      key={index}
                      className="p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg flex items-start justify-between"
                    >
                      <div className="flex-grow">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
                          Image {index + 1}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 break-all">
                          {item.url.substring(0, 60)}...
                        </p>
                        {item.caption && (
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 italic">
                            "{item.caption}"
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            gallery: prev.gallery.filter((_, i) => i !== index),
                          }));
                        }}
                        className="ml-4 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Gallery Item */}
              <div className="space-y-3 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-300 dark:border-neutral-700 rounded-lg">
                <div>
                  <label htmlFor="galleryFile" className="block text-xs font-semibold text-neutral-900 dark:text-white mb-2">
                    Upload Images
                  </label>
                  <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-amber-500 dark:hover:border-amber-500 transition-colors cursor-pointer bg-white dark:bg-neutral-800">
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Click to upload
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                    <input
                      id="galleryFile"
                      ref={galleryFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => setSelectedGalleryFiles(Array.from(e.target.files || []))}
                      className="hidden"
                    />
                  </label>
                  {selectedGalleryFiles.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                      {selectedGalleryFiles.length === 1
                        ? `Selected: ${selectedGalleryFiles[0].name}`
                        : `${selectedGalleryFiles.length} files selected`}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 dark:text-white mb-2">
                    Caption (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Describe this image (e.g., 'Market vendors at Kigali Central Market')"
                    value={galleryCaption}
                    onChange={(e) => setGalleryCaption(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const files = selectedGalleryFiles;

                    if (files.length === 0) {
                      setMessage({ type: 'error', text: 'Please select at least one image file' });
                      return;
                    }

                    const invalidType = files.find((file) => !file.type.startsWith('image/'));
                    if (invalidType) {
                      setMessage({ type: 'error', text: `Invalid file type: ${invalidType.name}` });
                      return;
                    }

                    const oversized = files.find((file) => file.size > 10 * 1024 * 1024);
                    if (oversized) {
                      setMessage({ type: 'error', text: `Image too large (max 10MB): ${oversized.name}` });
                      return;
                    }

                    setUploading(true);
                    try {
                      const uploads = await Promise.allSettled(
                        files.map(async (file) => {
                          const formData = new FormData();
                          formData.append('file', file);

                          const response = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData,
                          });

                          const data = await response.json();
                          if (!data.success) {
                            throw new Error(data.error || `Failed to upload ${file.name}`);
                          }

                          return { url: data.url as string, caption: galleryCaption.trim() };
                        })
                      );

                      const successful = uploads
                        .filter((result): result is PromiseFulfilledResult<{ url: string; caption: string }> => result.status === 'fulfilled')
                        .map((result) => result.value);
                      const failedCount = uploads.length - successful.length;

                      if (successful.length > 0) {
                        setForm((prev) => ({
                          ...prev,
                          gallery: [...prev.gallery, ...successful],
                        }));
                        setSelectedGalleryFiles([]);
                        if (galleryFileInputRef.current) {
                          galleryFileInputRef.current.value = '';
                        }
                        setGalleryCaption('');

                        if (failedCount === 0) {
                          setMessage({ type: 'success', text: `${successful.length} image(s) added to gallery!` });
                        } else {
                          setMessage({
                            type: 'error',
                            text: `${successful.length} uploaded, ${failedCount} failed. Please retry failed files.`,
                          });
                        }
                        setTimeout(() => setMessage(null), 3000);
                      } else {
                        setMessage({ type: 'error', text: 'Failed to upload selected images' });
                      }
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Failed to upload selected images' });
                    } finally {
                      setUploading(false);
                    }
                  }}
                  disabled={uploading}
                  className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-red-700/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Add to Gallery'}
                </button>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g., Rwanda, Technology, Innovation"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
              />
            </div>

            {/* Read Time */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Estimated Read Time (minutes)
              </label>
              <input
                type="number"
                name="readTime"
                value={form.readTime}
                onChange={handleChange}
                min="1"
                max="60"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none"
              />
            </div>

            {/* Featured */}
            <div className="mb-8 flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                name="featured"
                checked={form.featured}
                onChange={handleChange}
                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700"
              />
              <label htmlFor="featured" className="text-sm font-medium text-neutral-900 dark:text-white">
                Feature this article on homepage
              </label>
            </div>

            {/* Submit Buttons */}
            <div className={`grid grid-cols-1 ${adminRole === 'editor' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
              <button
                type="button"
                onClick={() => submitArticle('draft')}
                disabled={loading}
                className="px-6 py-3 bg-neutral-700 hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 disabled:bg-neutral-400 dark:disabled:bg-neutral-700/40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => submitArticle('archived')}
                disabled={loading}
                className="px-6 py-3 bg-amber-700 hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600 disabled:bg-amber-400 dark:disabled:bg-amber-700/40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Unpublish'}
              </button>
              {adminRole !== 'editor' && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-red-700 hover:bg-red-800 disabled:bg-red-700/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Publishing...' : 'Publish Article'}
                </button>
              )}
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-12 bg-amber-50 dark:bg-amber-950/30 border border-red-200 dark:border-amber-900/50 rounded-lg p-6">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">Tips for Publishing</h3>
            <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
              <li>✓ Use clear, descriptive headlines</li>
              <li>✓ Write compelling excerpts (100-150 characters)</li>
              <li>✓ Use high-quality featured images from file upload or URLs</li>
              <li>✓ Add additional gallery images with descriptive captions</li>
              <li>✓ Add relevant tags for better discoverability</li>
              <li>✓ Ensure read time is accurate</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

