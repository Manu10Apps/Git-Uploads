'use client';

import React, { useState, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface CategorySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  includeAll?: boolean;
  preferredSlugs?: string[];
  strictPreferred?: boolean;
}

export default function CategorySelect({
  value = '',
  onChange,
  disabled = false,
  required = false,
  className = '',
  placeholder = 'Select a category',
  includeAll = false,
  preferredSlugs = [],
  strictPreferred = false,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const endpoint = includeAll ? '/api/admin/categories?includeAll=true' : '/api/admin/categories';
        const response = await fetch(endpoint);
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
          setError(null);
        } else {
          setError('Failed to load categories');
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Error loading categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [includeAll]);

  return (
    <div className="w-full">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || loading}
        required={required}
        className={`w-full px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-700 focus:border-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        <option value="">{placeholder}</option>
        {(function getVisibleCategories() {
          if (preferredSlugs.length === 0) {
            return categories;
          }

          const slugIndex = new Map(preferredSlugs.map((slug, index) => [slug, index]));
          const preferred = categories.filter((cat) => slugIndex.has(cat.slug));
          const sortedPreferred = [...preferred].sort(
            (a, b) => (slugIndex.get(a.slug) ?? 999) - (slugIndex.get(b.slug) ?? 999)
          );

          if (strictPreferred) {
            return sortedPreferred;
          }

          const others = categories.filter((cat) => !slugIndex.has(cat.slug));
          return [...sortedPreferred, ...others];
        })().map((cat) => (
          <option key={cat.id} value={String(cat.id)}>
            {cat.name}
          </option>
        ))}
      </select>
      {loading && <p className="mt-1 text-sm text-gray-500">Loading categories...</p>}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

