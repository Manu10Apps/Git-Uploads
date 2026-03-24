import { existsSync } from 'fs';
import path from 'path';
import { normalizeArticleImageUrl } from '@/lib/utils';

type GalleryItem = {
  url?: string;
  caption?: string;
};

const DEFAULT_ARTICLE_IMAGE = '/uploads/article-fallback.svg';

function parseGallery(gallery: string | null | undefined): GalleryItem[] {
  if (!gallery) {
    return [];
  }

  try {
    const parsed = JSON.parse(gallery);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isMissingLocalUpload(url: string | null): boolean {
  if (!url || !url.startsWith('/uploads/')) {
    return false;
  }

  const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
  return !existsSync(filePath);
}

function firstValidGalleryImage(gallery: string | null | undefined): string | null {
  const galleryItems = parseGallery(gallery);

  for (const item of galleryItems) {
    const normalized = normalizeArticleImageUrl(item?.url);
    if (!normalized) {
      continue;
    }

    if (isMissingLocalUpload(normalized)) {
      continue;
    }

    return normalized;
  }

  return null;
}

type ResolveArticleImageOptions = {
  fallbackImage?: string;
};

export function resolveArticleImage(
  image: string | null | undefined,
  gallery: string | null | undefined,
  options?: ResolveArticleImageOptions
): string {
  const fallbackImage = options?.fallbackImage || DEFAULT_ARTICLE_IMAGE;
  const normalizedImage = normalizeArticleImageUrl(image);
  const galleryImage = firstValidGalleryImage(gallery);

  if (!normalizedImage) {
    return galleryImage || fallbackImage;
  }

  if (isMissingLocalUpload(normalizedImage)) {
    return galleryImage || fallbackImage;
  }

  return normalizedImage;
}
