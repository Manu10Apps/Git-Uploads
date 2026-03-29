'use client';

import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Upload, X } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';
import ContentEditor from '@/app/admin/components/ContentEditor';
import { ArticleImage } from '@/app/components/ArticleImage';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { NAV_CATEGORY_SLUGS } from '@/lib/nav-categories';

const FALLBACK_ARTICLE_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#e5e5e5"/><rect x="80" y="80" width="1040" height="515" rx="24" fill="#d4d4d4"/><circle cx="300" cy="250" r="68" fill="#bdbdbd"/><path d="M180 515l215-195 145 130 185-170 295 235H180z" fill="#a3a3a3"/><text x="600" y="610" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" fill="#525252">Intambwe Media</text></svg>')}`;

interface ArticleForm {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  image: string;
  tags: string;
  featured: boolean;
  gallery: Array<{ url: string; caption: string }>;
}

interface ArticleMetadata {
  views: number;
  publishedAt: string;
  status: 'published' | 'draft' | 'archived';
}

type ArticleStatus = 'published' | 'draft' | 'archived';

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<ArticleForm>({
    title: '',
    excerpt: '',
    content: '',
    category: 'technology',
    author: '',
    image: '',
    tags: '',
    featured: false,
    gallery: [],
  });

  const [metadata, setMetadata] = useState<ArticleMetadata>({
    views: 0,
    publishedAt: '',
    status: 'draft',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [degradedNotice, setDegradedNotice] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ name: string; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryCaption, setGalleryCaption] = useState('');
  const galleryFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);
  const [adminRole, setAdminRole] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const [categories, setCategories] = useState<Array<{ id: number; slug: string; name: string }>>([]);
  const visibleCategories = React.useMemo(() => {
    const slugIndex = new Map(NAV_CATEGORY_SLUGS.map((slug, index) => [slug, index]));
    const preferred = categories
      .filter((cat) => slugIndex.has(cat.slug))
      .sort((a, b) => (slugIndex.get(a.slug) ?? 999) - (slugIndex.get(b.slug) ?? 999));
    const others = categories.filter((cat) => !slugIndex.has(cat.slug));
    return [...preferred, ...others];
  }, [categories]);

  useEffect(() => {
    const isAdminAuth = localStorage.getItem('adminAuth');
    if (!isAdminAuth) {
      router.push('/admin/login');
      return;
    }
    setAdminRole(localStorage.getItem('adminRole') || '');
    setAdminEmail(localStorage.getItem('adminEmail') || '');

    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesRes = await fetch('/api/admin/categories?includeAll=true');
        const categoriesData = await categoriesRes.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data);
        }
        if (categoriesData?.degraded) {
          setDegradedNotice(categoriesData.message || 'Database is unavailable. You are currently using fallback storage.');
        }

        // Fetch article
        const articleRes = await fetch(`/api/articles/${articleId}`);
        const articleData = await articleRes.json();
        if (articleData?.degraded) {
          setDegradedNotice(articleData.message || 'Database is unavailable. You are currently using fallback storage.');
        }
        
        if (articleData.success) {
          const article = articleData.data;
          setForm({
            title: article.title,
            excerpt: article.excerpt,
            content: article.content,
            category: article.category,
            author: article.author,
            image: article.image,
            tags: Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || ''),
            featured: article.featured || false,
            gallery: article.gallery && typeof article.gallery === 'string' 
              ? JSON.parse(article.gallery) 
              : (article.gallery || []),
          });
          setMetadata({
            views: 0,
            publishedAt: article.publishedAt || new Date().toISOString(),
            status: article.status || 'draft',
          });
          setUploadedImage(null);
        } else {
          setMessage({ type: 'error', text: 'Article not found' });
        }
      } catch (error) {
        console.error('Failed to fetch article:', error);
        setMessage({ type: 'error', text: 'Failed to load article' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, articleId]);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setDegradedNotice(data?.degraded ? (data.message || 'Database is unavailable. You are currently using fallback storage.') : null);

      if (data.success) {
        setUploadedImage({ name: file.name, url: data.url });
        setForm((prev) => ({ ...prev, image: data.url }));
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

    try {
      const tagArray = form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');

      // Find category ID from slug
      const selectedCategory = categories.find((cat) => cat.slug === form.category);
      const categoryId = selectedCategory?.id;

      if (!categoryId) {
        setMessage({ type: 'error', text: 'Please select a valid category' });
        setLoading(false);
        return;
      }

      if (!form.image || !form.image.trim()) {
        setMessage({ type: 'error', text: 'Please upload a featured image for this article' });
        setLoading(false);
        return;
      }

      const publishedAtForUpdate = status === 'published'
        ? (metadata.publishedAt || new Date().toISOString())
        : null;

      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          content: form.content,
          categoryId,
          author: form.author,
          image: form.image.trim(),
          tags: tagArray,
          featured: form.featured,
          gallery: form.gallery,
          status,
          publishedAt: publishedAtForUpdate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const successMessage =
          status === 'published'
            ? 'Article published successfully!'
            : status === 'draft'
              ? 'Draft saved successfully!'
              : 'Article unpublished successfully!';

        setMessage({ type: 'success', text: successMessage });
        setMetadata((prev) => ({
          ...prev,
          status,
          publishedAt: status === 'published' ? (publishedAtForUpdate || prev.publishedAt) : '',
        }));
        setTimeout(() => {
          router.push('/admin/articles');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update article' });
      }
    } catch (error) {
      console.error('Submit error:', error);
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
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
              Edit Article
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Update the article details
            </p>
          </div>

          {degradedNotice && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {degradedNotice}
            </div>
          )}

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

          <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
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
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-700 focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Author Name *
              </label>
              <input
                type="text"
                name="author"
                value={form.author}
                onChange={handleChange}
                placeholder="Enter author name"
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-700 focus:border-transparent outline-none"
                required
              />
            </div>

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
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-700 focus:border-transparent outline-none"
                required
              />
            </div>

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
                focusRingClassName="focus:ring-2 focus:ring-amber-700"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Category *
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-700 focus:border-transparent outline-none"
                required
              >
                <option value="">Select a category</option>
                {visibleCategories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                Featured Image
              </label>

              {/* Image Preview */}
              {(uploadedImage?.url || form.image) && (
                <div className="mb-4 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  <ArticleImage
                    src={normalizeArticleImageUrl(uploadedImage?.url || form.image) ?? FALLBACK_ARTICLE_IMAGE}
                    alt="Featured image preview"
                    fallbackSrc={FALLBACK_ARTICLE_IMAGE}
                    className="w-full h-52 object-cover"
                  />
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate min-w-0">
                      {uploadedImage ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <span className="text-green-800 dark:text-green-200">{uploadedImage.name}</span>
                        </span>
                      ) : (
                        <span className="truncate block">{form.image}</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setForm((prev) => ({ ...prev, image: '' }));
                      }}
                      className="ml-2 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors flex-shrink-0"
                      title="Remove image"
                    >
                      <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div>
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
              </div>
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
                  <label htmlFor="galleryFileEdit" className="block text-xs font-semibold text-neutral-900 dark:text-white mb-2">
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
                      id="galleryFileEdit"
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
                className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-amber-700 focus:border-transparent outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Current Status
                </label>
                <div className="w-full px-4 py-2 border rounded-lg text-sm font-semibold flex items-center gap-2
                  border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                  {metadata.status === 'published' && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                      <span className="text-green-700 dark:text-green-400">Published</span>
                    </span>
                  )}
                  {metadata.status === 'draft' && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-neutral-400 flex-shrink-0"></span>
                      <span className="text-neutral-600 dark:text-neutral-400">Draft</span>
                    </span>
                  )}
                  {metadata.status === 'archived' && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                      <span className="text-amber-700 dark:text-amber-400">Unpublished</span>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Total Views
                </label>
                <div className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white">
                  {metadata.views}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-900 dark:text-white mb-2">
                  Published Date
                </label>
                <div className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm">
                  {metadata.publishedAt ? new Date(metadata.publishedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Not published'}
                </div>
              </div>
            </div>

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
        </div>
      </main>
    </>
  );
}
