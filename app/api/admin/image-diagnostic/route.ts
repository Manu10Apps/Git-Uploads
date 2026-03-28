import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getUploadsDir } from '@/lib/upload-config';
import { resolveArticleImage } from '@/lib/article-images';
import { normalizeArticleImageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostic: Record<string, unknown> = {};

  // 1. Environment
  diagnostic.environment = {
    NODE_ENV: process.env.NODE_ENV,
    UPLOAD_DIR: process.env.UPLOAD_DIR || '(not set)',
    cwd: process.cwd(),
    uploadsDir: getUploadsDir(),
    uploadsDirExists: existsSync(getUploadsDir()),
    publicUploadsDir: path.join(process.cwd(), 'public', 'uploads'),
    publicUploadsDirExists: existsSync(path.join(process.cwd(), 'public', 'uploads')),
  };

  // 2. List files in uploads directory
  try {
    const uploadsDir = getUploadsDir();
    if (existsSync(uploadsDir)) {
      const files = await fs.readdir(uploadsDir);
      const imageFiles = files.filter((f) =>
        /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)$/i.test(f)
      );
      diagnostic.uploadsFiles = {
        total: files.length,
        imageCount: imageFiles.length,
        images: imageFiles.slice(0, 50),
      };
    } else {
      diagnostic.uploadsFiles = { error: 'Directory does not exist' };
    }
  } catch (e) {
    diagnostic.uploadsFiles = { error: String(e) };
  }

  // 3. Also check public/uploads if different from UPLOAD_DIR
  const publicUploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (publicUploadsDir !== getUploadsDir()) {
    try {
      if (existsSync(publicUploadsDir)) {
        const files = await fs.readdir(publicUploadsDir);
        const imageFiles = files.filter((f) =>
          /\.(jpg|jpeg|png|gif|webp|avif|svg|bmp)$/i.test(f)
        );
        diagnostic.publicUploadsFiles = {
          total: files.length,
          imageCount: imageFiles.length,
          images: imageFiles.slice(0, 50),
        };
      } else {
        diagnostic.publicUploadsFiles = { error: 'public/uploads does not exist' };
      }
    } catch (e) {
      diagnostic.publicUploadsFiles = { error: String(e) };
    }
  }

  // 4. Check article image values in the database
  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        image: true,
        gallery: true,
        status: true,
      },
      orderBy: { id: 'asc' },
      take: 50,
    });

    const articleImages = articles.map((a) => {
      const normalized = normalizeArticleImageUrl(a.image);
      const resolved = resolveArticleImage(a.image, a.gallery);
      const isNull = a.image === null;
      const isEmpty = a.image === '';
      const isUploadPath = normalized?.startsWith('/uploads/') ?? false;
      const fileExistsInUploads = isUploadPath
        ? (existsSync(path.join(getUploadsDir(), normalized!.replace(/^\/uploads\//, '')))
          || existsSync(path.join(process.cwd(), 'public', 'uploads', normalized!.replace(/^\/uploads\//, ''))))
        : false;

      return {
        id: a.id,
        title: a.title?.substring(0, 60),
        slug: a.slug,
        status: a.status,
        rawImage: a.image,
        normalizedImage: normalized,
        resolvedImage: resolved,
        imageIsNull: isNull,
        imageIsEmpty: isEmpty,
        imageIsUploadPath: isUploadPath,
        fileExistsOnDisk: fileExistsInUploads,
        hasGallery: !!a.gallery && a.gallery !== '[]' && a.gallery !== 'null',
      };
    });

    const stats = {
      totalArticles: articleImages.length,
      withNullImage: articleImages.filter((a) => a.imageIsNull).length,
      withEmptyImage: articleImages.filter((a) => a.imageIsEmpty).length,
      withUploadPath: articleImages.filter((a) => a.imageIsUploadPath).length,
      withExternalUrl: articleImages.filter(
        (a) => a.rawImage && /^https?:\/\//i.test(a.rawImage)
      ).length,
      withFileOnDisk: articleImages.filter((a) => a.fileExistsOnDisk).length,
      withGallery: articleImages.filter((a) => a.hasGallery).length,
    };

    diagnostic.articles = { stats, details: articleImages };
  } catch (e) {
    diagnostic.articles = { error: String(e) };
  }

  // 5. Test image resolution for known test cases
  diagnostic.resolutionTests = {
    nullImage: resolveArticleImage(null, null),
    emptyImage: resolveArticleImage('', null),
    validUpload: resolveArticleImage('/uploads/test.jpg', null),
    bareFilename: resolveArticleImage('test.jpg', null),
    externalUrl: resolveArticleImage('https://example.com/img.jpg', null),
  };

  // 6. Check fallback SVG exists
  const fallbackPath = path.join(getUploadsDir(), 'article-fallback.svg');
  diagnostic.fallbackSvg = {
    path: fallbackPath,
    exists: existsSync(fallbackPath),
  };

  return NextResponse.json(diagnostic, { status: 200 });
}
