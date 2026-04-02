'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { NAV_CATEGORY_ITEMS } from '@/lib/nav-categories';
import { Menu, X, Search, Moon, Sun, ChevronDown, Globe } from 'lucide-react';
import { SearchModal } from './SearchModal';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);
  const languageMenuRef = React.useRef<HTMLDivElement>(null);
  const { language, theme, setTheme, setLanguage } = useAppStore();
  const t = getTranslation(language);

  // Handle keyboard shortcut (Ctrl+K or Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        setIsMoreOpen(false);
        setIsLanguageOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreOpen(false);
      }

      if (languageMenuRef.current && !languageMenuRef.current.contains(target)) {
        setIsLanguageOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const homeItem = NAV_CATEGORY_ITEMS.find((item) => item.href === '/');
  const directCategorySlugs = ['epaper', 'amakuru', 'politiki', 'ubuzima', 'uburezi'] as const;
  const directCategoryItems = directCategorySlugs
    .map((slug) => NAV_CATEGORY_ITEMS.find((item) => item.slug === slug))
    .filter((item): item is (typeof NAV_CATEGORY_ITEMS)[number] => Boolean(item));
  const visibleItems = homeItem ? [homeItem, ...directCategoryItems] : directCategoryItems;
  const visibleItemHrefs = new Set(visibleItems.map((item) => item.href));
  const moreItems = NAV_CATEGORY_ITEMS.filter((item) => !visibleItemHrefs.has(item.href));
  const activeLanguageLabel = language === 'ky' ? 'RW' : language.toUpperCase();
  const languageOptions = [
    { code: 'ky', label: 'Kinyarwanda' },
    { code: 'en', label: 'English' },
    { code: 'sw', label: 'Kiswahili' },
  ] as const;

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-1 sm:gap-2 font-semibold text-base sm:text-lg tracking-wider text-neutral-900 dark:text-white flex-shrink-0"
          >
            <Image
              src="/logo.png"
              alt="Intambwe Media"
              width={48}
              height={48}
              priority
              sizes="48px"
              className="h-12 w-12 rounded-lg ml-2 sm:ml-3 md:ml-3 lg:ml-0"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {visibleItems.map((item) => {
              const parts = item.key.split('.');
              const label = (t as any)[parts[0]]?.[parts[1]] || item.key;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white hover:text-red-700 dark:hover:text-red-600 transition-colors whitespace-nowrap"
                >
                  <span className="nav-link pb-0.5">
                    {label}
                  </span>
                </Link>
              );
            })}

            {/* More Categories Dropdown */}
            {moreItems.length > 0 && (
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setIsMoreOpen(!isMoreOpen)}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white hover:text-red-700 dark:hover:text-red-600 transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <span className="nav-link pb-0.5">{t.nav.more}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute top-full right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-40">
                    {moreItems.map((item) => {
                      const parts = item.key.split('.');
                      const label = (t as any)[parts[0]]?.[parts[1]] || item.key;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="block px-4 py-2 text-xs sm:text-sm text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => setIsMoreOpen(false)}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="hidden min-[390px]:flex items-center justify-center px-2 sm:px-3 py-2 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 sm:w-5 h-4 sm:h-5" />
              ) : (
                <Moon className="w-4 sm:w-5 h-4 sm:h-5" />
              )}
            </button>

            {/* Language Switcher - visible on all sizes */}
            <div className="relative" ref={languageMenuRef}>
              <button
                onClick={() => setIsLanguageOpen((open) => !open)}
                aria-label={t.common.language}
                aria-expanded={isLanguageOpen}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" aria-hidden="true" />
                <span className="uppercase text-xs tracking-wide hidden min-[390px]:inline">{activeLanguageLabel}</span>
              </button>

              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-40 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 z-40">
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        setLanguage(option.code);
                        setIsLanguageOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        language === option.code
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                          : 'text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search (Ctrl+K)"
              title="Search articles (Ctrl+K)"
              className="flex items-center justify-center px-2 sm:px-3 py-2 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <Search className="w-4 sm:w-5 h-4 sm:h-5" aria-hidden="true" />
            </button>

            {/* Subscribe Button */}
            <div className="hidden md:flex flex-col items-center">
              <Link
                href="/#social-media-links"
                className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#e3001b' }}
              >
                {language === 'ky' ? 'Iyandikishe' : t.nav.subscribe}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 sm:p-2.5 hover:bg-white/10 dark:hover:bg-neutral-800/50 rounded-lg transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="w-5 sm:w-6 h-5 sm:h-6" />
              ) : (
                <Menu className="w-5 sm:w-6 h-5 sm:h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-3 sm:pb-4 space-y-1 sm:space-y-2 border-t border-neutral-200 dark:border-neutral-800 mt-2 max-h-[70vh] overflow-y-auto overscroll-contain">
            <div className="px-3 sm:px-4 pt-3">
              <Link
                href="/#social-media-links"
                className="inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: '#e3001b' }}
                onClick={() => setIsMenuOpen(false)}
              >
                {language === 'ky' ? 'Iyandikishe' : t.nav.subscribe}
              </Link>
            </div>
            {NAV_CATEGORY_ITEMS.map((item) => {
              const parts = item.key.split('.');
              const label = (t as any)[parts[0]]?.[parts[1]] || item.key;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 sm:px-4 py-3 rounded-lg text-sm sm:text-base text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors font-medium min-h-[44px]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}

