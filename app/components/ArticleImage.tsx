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

  React.useEffect(() => {
    const normalizedSrc = normalizeArticleImageUrl(src);
    setCurrentSrc(normalizedSrc ?? fallbackSrc);
    setHasErrored(false);
  }, [src, fallbackSrc]);

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    // Only fall back once - prevent infinite fallback loops
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