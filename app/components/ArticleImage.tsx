'use client';

import React from 'react';
import { normalizeArticleImageUrl } from '@/lib/utils';

const FALLBACK_ARTICLE_IMAGE = '/uploads/article-fallback.svg';

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
    // First failure: retry once after 2s to recover from transient hot-reload glitches
    if (!hasErrored && normalizedOriginalSrc && retryCountRef.current < 1) {
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        setCurrentSrc(`${normalizedOriginalSrc}?r=${retryCountRef.current}`);
      }, 2000);
      return;
    }
    // Retry also failed — show fallback permanently
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