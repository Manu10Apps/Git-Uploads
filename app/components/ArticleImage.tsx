'use client';

import React from 'react';
import Image from 'next/image';
import { normalizeArticleImageUrl } from '@/lib/utils';

const FALLBACK_ARTICLE_IMAGE = '/uploads/article-fallback.svg';
const RETRY_DELAY_MS = 1500;

function withRetryQuery(url: string, retryCount: number): string {
  const [baseWithQuery, hash = ''] = url.split('#');
  const separator = baseWithQuery.includes('?') ? '&' : '?';
  return `${baseWithQuery}${separator}img_retry=${retryCount}${hash ? `#${hash}` : ''}`;
}

type ArticleImageProps = {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export function ArticleImage({
  src,
  alt,
  fallbackSrc = FALLBACK_ARTICLE_IMAGE,
  className,
  loading,
  fetchPriority,
  sizes,
  onError,
}: ArticleImageProps) {
  const [currentSrc, setCurrentSrc] = React.useState(normalizeArticleImageUrl(src) ?? fallbackSrc);
  const [hasErrored, setHasErrored] = React.useState(false);
  const retryCountRef = React.useRef(0);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const normalizedSrc = normalizeArticleImageUrl(src);
    setCurrentSrc(normalizedSrc ?? fallbackSrc);
    setHasErrored(false);
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [src, fallbackSrc]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const normalizedOriginalSrc = normalizeArticleImageUrl(src);
    if (!hasErrored && normalizedOriginalSrc && retryCountRef.current < 1) {
      if (retryTimerRef.current) {
        return;
      }

      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        setCurrentSrc(withRetryQuery(normalizedOriginalSrc, retryCountRef.current));
      }, RETRY_DELAY_MS);
      return;
    }

    if (retryTimerRef.current) {
      return;
    }

    if (!hasErrored && currentSrc !== fallbackSrc) {
      setHasErrored(true);
      setCurrentSrc(fallbackSrc);
      return;
    }

    onError?.(event);
  };

  return (
    <span className="relative block w-full h-full">
      <Image
        src={currentSrc}
        alt={alt ?? 'Article image'}
        fill
        sizes={sizes ?? '100vw'}
        loading={loading ?? 'lazy'}
        fetchPriority={fetchPriority}
        className={className || 'object-cover'}
        onError={handleError}
      />
    </span>
  );
}
