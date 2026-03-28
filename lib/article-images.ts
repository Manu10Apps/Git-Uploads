import { existsSync } from 'fs';
import path from 'path';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { getUploadsDir } from '@/lib/upload-config';

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

  const filename = url.replace(/^\/uploads\//, '');

  // Check both UPLOAD_DIR and public/uploads/ (for git-tracked images)
  const primaryPath = path.join(getUploadsDir(), filename);
  if (existsSync(primaryPath)) {
    return false;
  }

  const publicPath = path.join(process.cwd(), 'public', 'uploads', filename);
  if (existsSync(publicPath)) {
    return false;
  }

  return true;
}

function isExternalUrl(url: string | null): boolean {
  if (!url) return false;
  return /^https?:\/\/|^\/\//i.test(url);
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

  // Return the stored image URL as-is (after normalization).
  // The client-side ArticleImage component handles broken/missing images
  // gracefully with retry + fallback, so we should NOT discard valid
  // database URLs based on server-side file existence checks.
  return normalizedImage;
}
