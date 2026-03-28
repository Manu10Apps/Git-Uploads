'use client';

import React from 'react';
import { normalizeArticleImageUrl } from '@/lib/utils';

const FALLBACK_ARTICLE_IMAGE = '/uploads/article-fallback.svg';
const RETRY_DELAY_MS = 1500;

function withRetryQuery(url: string, retryCount: number): string {
  const [baseWithQuery, hash = ''] = url.split('#');
  const separator = baseWithQuery.includes('?') ? '&' : '?';
  return `${baseWithQuery}${separator}img_retry=${retryCount}${hash ? `#${hash}` : ''}`;
}

type ArticleImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function ArticleImage({
  src,
  alt,
  fallbackSrc = FALLBACK_ARTICLE_IMAGE,
  className,
  loading,
  decoding,
  onError,
  ...props
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
    // First failure: retry once after a short delay to recover from transient hot-reload/network glitches.
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

    // Do not lock to fallback while a retry is still pending.
    if (retryTimerRef.current) {
      return;
    }

    // Retry also failed — show fallback permanently.
    if (!hasErrored && currentSrc !== fallbackSrc) {
      setHasErrored(true);
      setCurrentSrc(fallbackSrc);
      return;
    }
    onError?.(event);
  };

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt ?? 'Article image'}
      loading={loading ?? 'lazy'}
      decoding={decoding ?? 'async'}
      className={className || ''}
      onError={handleError}
    />
  );
}