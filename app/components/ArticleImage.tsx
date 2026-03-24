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

  React.useEffect(() => {
    setCurrentSrc(normalizeArticleImageUrl(src) ?? fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt ?? 'Article image'}
      loading={loading ?? 'lazy'}
      decoding={decoding ?? 'async'}
      className={className || ''}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          return;
        }
        onError?.(event);
      }}
    />
  );
}