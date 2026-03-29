import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getUploadsDir } from '@/lib/upload-config';
import { normalizeArticleImageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const IMAGE_EXTENSIONS_REGEX = /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)$/i;

async function getAuthorizedAdmin(request: NextRequest, db: PrismaClient) {
  const requesterEmail = request.headers.get('x-admin-email')?.trim().toLowerCase();
  const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

  if (!requesterEmail) {
    return { error: 'Unauthorized: missing admin identity', status: 401 as const };
  }

  if (envAdminEmail && requesterEmail === envAdminEmail) {
    return { success: true as const };
  }

  const requester = await db.adminUser.findUnique({
    where: { email: requesterEmail },
    select: { role: true },
  });

  if (!requester || requester.role !== 'admin') {
    return { error: 'Only admins can run image repair', status: 403 as const };
  }

  return { success: true as const };
}

function extractImageFilename(rawImage: string | null | undefined): string | null {
  if (!rawImage) {
    return null;
  }

  const normalized = rawImage.trim().replace(/\\/g, '/');
  if (!normalized) {
    return null;
  }

  const withoutQueryAndHash = normalized.split('?')[0]?.split('#')[0] || normalized;
  const segments = withoutQueryAndHash.split('/').filter(Boolean);
  const filename = segments.at(-1);

  if (!filename || !IMAGE_EXTENSIONS_REGEX.test(filename)) {
    return null;
  }

  return filename;
}

async function getAvailableImages(): Promise<string[]> {
  const imageSet = new Set<string>();
  const imageFilter = (f: string) =>
    /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f) && !f.includes('fallback');

  // Check primary uploads dir (UPLOAD_DIR or public/uploads/)
  const uploadsDir = getUploadsDir();
  if (existsSync(uploadsDir)) {
    try {
      const files = await fs.readdir(uploadsDir);
      files.filter(imageFilter).forEach((f) => imageSet.add(`/uploads/${f}`));
    } catch { /* ignore */ }
  }

  // Also check public/uploads/ if different from primary
  const publicUploads = path.join(process.cwd(), 'public', 'uploads');
  if (publicUploads !== uploadsDir && existsSync(publicUploads)) {
    try {
      const files = await fs.readdir(publicUploads);
      files.filter(imageFilter).forEach((f) => imageSet.add(`/uploads/${f}`));
    } catch { /* ignore */ }
  }

  return Array.from(imageSet).sort();
}

function isImageBroken(
  rawImage: string | null,
  uploadsDir: string
): { broken: boolean; reason: string } {
  const normalized = normalizeArticleImageUrl(rawImage);

  if (!normalized) {
    return { broken: true, reason: 'null_or_empty' };
  }

  if (/^https?:\/\//i.test(normalized)) {
    return { broken: false, reason: 'external_url_preserved' };
  }

  if (normalized.startsWith('/uploads/')) {
    const filename = normalized.replace(/^\/uploads\//, '');
    // Check both UPLOAD_DIR and public/uploads/ (for git-tracked images)
    const primaryPath = path.join(uploadsDir, filename);
    const publicPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (!existsSync(primaryPath) && !existsSync(publicPath)) {
      return { broken: true, reason: 'file_missing_on_disk' };
    }
    return { broken: false, reason: 'ok' };
  }

  const filename = extractImageFilename(normalized);
  if (filename) {
    const primaryPath = path.join(uploadsDir, filename);
    const publicPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (!existsSync(primaryPath) && !existsSync(publicPath)) {
      return { broken: true, reason: 'filename_not_found_on_disk' };
    }
    return { broken: true, reason: 'legacy_filename_path' };
  }

  return { broken: true, reason: 'unknown_path_format' };
}

function pickBestReplacementImage(
  rawImage: string | null,
  availableImagesByFilename: Map<string, string>,
  availableImages: string[],
  fallbackIndex: number
): { newImage: string; strategy: 'filename_match' | 'round_robin' } {
  const filename = extractImageFilename(rawImage);
  if (filename) {
    const matched = availableImagesByFilename.get(filename.toLowerCase());
    if (matched) {
      return { newImage: matched, strategy: 'filename_match' };
    }
  }

  return {
    newImage: availableImages[fallbackIndex % availableImages.length],
    strategy: 'round_robin',
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedAdmin(request, prisma);
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const mode: string = body?.mode || 'preview';

    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        gallery: true,
      },
      orderBy: { id: 'asc' },
    });

    const uploadsDir = getUploadsDir();
    const availableImages = await getAvailableImages();
    const availableImagesByFilename = new Map<string, string>();
    for (const imagePath of availableImages) {
      const filename = extractImageFilename(imagePath);
      if (filename) {
        availableImagesByFilename.set(filename.toLowerCase(), imagePath);
      }
    }

    const brokenArticles = articles
      .map((a) => {
        const check = isImageBroken(a.image, uploadsDir);
        return { ...a, ...check };
      })
      .filter((a) => a.broken);

    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        mode: 'preview',
        uploadsDir,
        uploadsDirExists: existsSync(uploadsDir),
        totalArticles: articles.length,
        brokenArticles: brokenArticles.length,
        availableImages: availableImages.length,
        broken: brokenArticles.map((a) => ({
          id: a.id,
          title: a.title?.substring(0, 80),
          currentImage: a.image,
          reason: a.reason,
          suggestedImage: pickBestReplacementImage(
            a.image,
            availableImagesByFilename,
            availableImages,
            0
          ).newImage,
        })),
        availableImagesList: availableImages.slice(0, 30),
        instruction:
          'Send POST with { "mode": "fix" } to assign available images to broken articles.',
      });
    }

    if (mode !== 'fix') {
      return NextResponse.json(
        { error: 'Invalid mode. Use "preview" or "fix".' },
        { status: 400 }
      );
    }

    if (availableImages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No image files found in the uploads directory.',
        uploadsDir,
        uploadsDirExists: existsSync(uploadsDir),
      });
    }

    const results: Array<{
      id: number;
      title: string;
      oldImage: string | null;
      newImage: string;
      reason: string;
      status: string;
    }> = [];

    for (let i = 0; i < brokenArticles.length; i++) {
      const article = brokenArticles[i];
      const selection = pickBestReplacementImage(
        article.image,
        availableImagesByFilename,
        availableImages,
        i
      );
      const newImage = selection.newImage;

      try {
        await prisma.article.update({
          where: { id: article.id },
          data: { image: newImage },
        });

        results.push({
          id: article.id,
          title: article.title?.substring(0, 80) || '',
          oldImage: article.image,
          newImage,
          reason: `${article.reason} -> ${selection.strategy}`,
          status: 'fixed',
        });
      } catch (e) {
        results.push({
          id: article.id,
          title: article.title?.substring(0, 80) || '',
          oldImage: article.image,
          newImage,
          reason: `${article.reason} -> ${selection.strategy}`,
          status: `failed: ${String(e)}`,
        });
      }
    }

    const fixed = results.filter((r) => r.status === 'fixed').length;
    const failed = results.filter((r) => r.status !== 'fixed').length;

    return NextResponse.json({
      success: true,
      mode: 'fix',
      totalArticles: articles.length,
      brokenBefore: brokenArticles.length,
      fixed,
      failed,
      results,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
