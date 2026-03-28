'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import Link from 'next/link';

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export function Footer() {
  const { language, setLanguage } = useAppStore();
  const t = getTranslation(language);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/categories');
        const data = await response.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const languages = [
    { code: 'ky', name: 'Kinyarwanda' },
    { code: 'en', name: 'English' },
    { code: 'sw', name: 'Swahili' },
  ];

  return (
    <footer className="bg-neutral-900 dark:bg-black border-t border-neutral-800 dark:border-neutral-800 text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12 mb-8 sm:mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <img src="/logo.png" alt="Amakuru" className="h-12 w-auto rounded-lg" />
            <p className="text-sm text-neutral-400 font-light leading-relaxed">
              Inkuru zicukumbuye ku bibazo bikomeye muri Afurika y’Iburasirazuba, zikozwe mu buryo bwigenga kandi bwizewe.
            </p>
          </div>

          {/* Ibice - Categories except Ahabanza */}
          <div className="space-y-4">
            <h4 className="font-semibold tracking-widest text-xs">Ibice</h4>
            <ul className="space-y-3 text-sm">
              {categories
                .filter((category) => category.name !== 'Ahabanza')
                .slice(0, 6)
                .map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="text-white dark:text-white hover:text-red-600 dark:hover:text-red-600 transition-colors font-light"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-bold">{t.footer.legal}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="text-white dark:text-white hover:text-red-600 dark:hover:text-red-600 transition-colors"
                >
                  {t.footer.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-white dark:text-white hover:text-red-600 dark:hover:text-red-600 transition-colors"
                >
                  {t.footer.termsConditions}
                </Link>
              </li>
              <li>
                <Link
                  href="/ethics"
                  className="text-white dark:text-white hover:text-red-600 dark:hover:text-red-600 transition-colors"
                >
                  {t.footer.ethicsPolicy}
                </Link>
              </li>
            </ul>
          </div>

          {/* Language Selector */}
          <div className="space-y-4">
            <h4 className="font-bold">{t.footer.language}</h4>
            <div className="flex flex-wrap gap-2">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as any)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    language === lang.code
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6 sm:pt-8 flex flex-col items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
          <div id="social-media-links" className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-white scroll-mt-28">
            <a
              href="https://x.com/intambwemedias"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link p-2 hover:scale-110 transition-transform"
              aria-label="X"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.223-6.831-5.97 6.831H2.423l7.723-8.835L1.457 2.25h6.888l4.722 6.236 5.454-6.236zM17.15 20.005h1.828L6.883 3.996H5.017l12.133 16.009z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/intambwemedia"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link p-2 hover:scale-110 transition-transform"
              aria-label="Facebook"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/intambwemedia/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link p-2 hover:scale-110 transition-transform"
              aria-label="LinkedIn"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/@intambwemedia"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link p-2 hover:scale-110 transition-transform"
              aria-label="YouTube"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@intambwemedia"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link p-2 hover:scale-110 transition-transform"
              aria-label="TikTok"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M19.498 7.094a4.994 4.994 0 0 1-3.622-1.49A4.992 4.992 0 0 1 13.364 1h-3.75v14.25a2.625 2.625 0 1 1-5.25-2.625 2.63 2.63 0 0 1 .81.125v-3.82a6.375 6.375 0 1 0 9.375 6.177V8.78a8.088 8.088 0 0 0 4.969 1.594V6.59a4.966 4.966 0 0 1-.5-.496z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/intambwemedia/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link p-2 hover:scale-110 transition-transform"
              aria-label="Instagram"
            >
              <svg
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.756 0 8.331.012 7.052.07 2.696.278.278 2.579.07 7.052.012 8.331 0 8.756 0 12s.012 3.669.07 4.948c.208 4.474 2.626 6.875 7.052 7.083 1.28.058 1.704.07 4.948.07s3.669-.012 4.948-.07c4.469-.208 6.875-2.626 7.083-7.052.058-1.28.07-1.704.07-4.948s-.012-3.669-.07-4.948c-.208-4.474-2.626-6.875-7.052-7.083C15.669.012 15.245 0 12 0z" />
                <circle cx="12" cy="12" r="3.6" />
                <circle cx="18.406" cy="5.594" r="1.44" />
              </svg>
            </a>
          </div>
          <p>{t.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

