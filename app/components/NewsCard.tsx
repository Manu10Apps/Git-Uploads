'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { getTranslation } from '@/lib/translations';
import { ArticleImage } from '@/app/components/ArticleImage';
import { Heart, Share2, Bookmark, FileText, Copy } from 'lucide-react';
import { useArticleTranslation } from '@/lib/use-article-translation';

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  image: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  featured?: boolean;
  slug: string;
}

export function NewsCard({
  id,
  title,
  excerpt,
  content = '',
  image,
  category,
  author,
  publishedAt,
  readTime,
  featured = false,
  slug,
}: NewsCardProps) {
  const router = useRouter();
  const { language } = useAppStore();
  const t = getTranslation(language);

  const {
    title: translatedTitle,
    excerpt: translatedExcerpt,
    isTranslating,
  } = useArticleTranslation({
    articleId: id,
    originalTitle: title,
    originalExcerpt: excerpt,
    originalContent: content,
  });
  const [isSaved, setIsSaved] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [origin, setOrigin] = React.useState('');
  const shareMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Navigate to article
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or action elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    router.push(`/article/${slug}`);
  };

  // Close share menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  const shareUrl = `${origin}/article/${slug}`;

  const handleShare = () => {
    setShowShareMenu(!showShareMenu);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setShowShareMenu(false);
  };

  const handleSocialShare = (platform: string) => {
    let url = '';
    const text = encodeURIComponent(title);
    const pageUrl = encodeURIComponent(shareUrl);

    switch (platform) {
      case 'twitter':
        url = `https://x.com/intent/tweet?text=${text}&url=${pageUrl}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
      setShowShareMenu(false);
    }
  };

  const categoryColors: Record<string, string> = {
    politics: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200',
    business: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
    technology: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
    investigations: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200',
    culture: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200',
    sports: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200',
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group glass rounded-lg sm:rounded-xl overflow-hidden hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${
        featured ? 'sm:col-span-2' : ''
      } ${isTranslating ? 'opacity-80' : ''}`}
    >
        {/* Image Container */}
        <div className="relative overflow-hidden bg-neutral-200 dark:bg-neutral-700 h-40 sm:h-48 md:h-56">
          <ArticleImage
            src={image}
            alt={translatedTitle}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />

          {/* Badge */}
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
            <span
              className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                categoryColors[category] ||
                'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
              }`}
            >
              {category}
            </span>
          </div>

          {/* Breaking Badge */}
          {featured && (
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
              <span className="inline-flex px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                {t.home.breakingNews}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-4">
          {/* Title */}
          <h3 className="text-base sm:text-lg md:text-xl font-bold leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
            {translatedTitle}
          </h3>

          {/* Excerpt */}
          <p className="text-xs sm:text-sm md:text-base text-neutral-600 dark:text-neutral-400 line-clamp-2">
            {translatedExcerpt}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-neutral-500 dark:text-neutral-500">
            <span className="truncate">{author}</span>
            <span className="hidden sm:inline">•</span>
            <span className="truncate">{publishedAt}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 sm:pt-3 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsSaved(!isSaved);
            }}
            className="p-2 sm:p-2.5 hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded transition-colors"
            aria-label={t.article.bookmark}
            title="Save article"
          >
            <Bookmark
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill={isSaved ? 'currentColor' : 'none'}
            />
          </button>
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="p-2 sm:p-2.5 hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded transition-colors"
              aria-label="Share article"
              title="Share"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Share Menu */}
            {showShareMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 p-2 min-w-max max-w-[calc(100vw-1rem)] z-50">
                {/* Copy Link Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyLink();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 sm:py-3 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded transition-colors text-xs sm:text-sm font-medium"
                  title="Copy article link"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy link</span>
                </button>
                
                {/* Social Media Share Buttons */}
                <div className="border-t border-neutral-200 dark:border-neutral-700 my-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSocialShare('twitter');
                    }}
                    className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded transition-colors"
                    aria-label="Share on X"
                    title="Share on X"
                  >
                    <svg
                      className="w-4 h-4 fill-current"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.223-6.831-5.97 6.831H2.423l7.723-8.835L1.457 2.25h6.888l4.722 6.236 5.454-6.236zM17.15 20.005h1.828L6.883 3.996H5.017l12.133 16.009z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSocialShare('facebook');
                    }}
                    className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded transition-colors"
                    aria-label="Share on Facebook"
                    title="Share on Facebook"
                  >
                    <svg
                      className="w-4 h-4 fill-current"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSocialShare('linkedin');
                    }}
                    className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-600 hover:bg-white/50 dark:hover:bg-neutral-700/50 rounded transition-colors"
                    aria-label="Share on LinkedIn"
                    title="Share on LinkedIn"
                  >
                    <svg
                      className="w-4 h-4 fill-current"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/article/${slug}`);
            }}
            className="ml-auto px-3 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
          >
            {t.common.readMore}
          </button>
        </div>
      </div>
    </article>
    );
  }

