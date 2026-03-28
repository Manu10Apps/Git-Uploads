import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getUploadsDir } from '@/lib/upload-config';

// Fallback SVG served when a requested upload file cannot be found in any
// known uploads directory.
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#e5e5e5"/><rect x="80" y="80" width="1040" height="515" rx="24" fill="#d4d4d4"/><circle cx="300" cy="250" r="68" fill="#bdbdbd"/><path d="M180 515l215-195 145 130 185-170 295 235H180z" fill="#a3a3a3"/><text x="600" y="610" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" fill="#525252">Intambwe Media</text></svg>`;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXTENSION[ext] || 'application/octet-stream';
}

/**
 * Returns an ordered list of directories to search for upload files.
 * 1. The configured uploads dir (UPLOAD_DIR env var or public/uploads/)
 * 2. public/uploads/ as a fallback (contains git-tracked images like the
 *    fallback SVG and any pre-seeded article images).
 */
function getSearchDirs(): string[] {
  const primary = path.resolve(getUploadsDir());
  const publicUploads = path.resolve(process.cwd(), 'public', 'uploads');

  if (primary === publicUploads) {
    return [primary];
  }
  return [primary, publicUploads];
}

type RouteContext = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const rawSegments = params.slug || [];
  const safeSegments = rawSegments.filter((segment) =>
    segment && segment !== '.' && segment !== '..' && !segment.includes('/') && !segment.includes('\\')
  );

  const debugMode = new URL(request.url).searchParams.has('debug');
  const debugInfo: Record<string, unknown> = {};

  if (safeSegments.length > 0) {
    const searchDirs = getSearchDirs();
    if (debugMode) {
      debugInfo.safeSegments = safeSegments;
      debugInfo.searchDirs = searchDirs;
      debugInfo.cwd = process.cwd();
      debugInfo.attempts = [];
    }

    // Try each search directory in order
    for (const dir of searchDirs) {
      const uploadsRoot = path.resolve(dir);
      const requestedPath = path.resolve(uploadsRoot, ...safeSegments);

      // Path traversal guard
      if (!requestedPath.startsWith(uploadsRoot)) {
        if (debugMode) (debugInfo.attempts as unknown[]).push({ dir, requestedPath, error: 'path_traversal_blocked' });
        continue;
      }

      const fileExists = existsSync(requestedPath);
      if (debugMode) (debugInfo.attempts as unknown[]).push({ dir, requestedPath, fileExists });

      try {
        const fileBuffer = await readFile(requestedPath);
        if (debugMode) {
          debugInfo.served = true;
          debugInfo.contentType = getContentType(requestedPath);
          debugInfo.size = fileBuffer.length;
          return NextResponse.json(debugInfo);
        }
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': getContentType(requestedPath),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } catch (err) {
        if (debugMode) {
          const lastAttempt = (debugInfo.attempts as Record<string, unknown>[]).at(-1);
          if (lastAttempt) lastAttempt.readError = String(err);
        }
        // File does not exist in this directory; try next.
      }
    }
  } else if (debugMode) {
    debugInfo.error = 'no_safe_segments';
    debugInfo.rawSegments = rawSegments;
  }

  if (debugMode) {
    debugInfo.served = false;
    debugInfo.result = 'placeholder_svg';
    return NextResponse.json(debugInfo);
  }

  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
