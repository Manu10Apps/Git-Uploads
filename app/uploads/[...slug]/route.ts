import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getUploadsDir } from '@/lib/upload-config';

// Served when a /uploads/* file does not exist on disk.
// Next.js static-file serving handles requests for files that DO exist,
// so this route is only reached when the file is missing.
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

type RouteContext = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const rawSegments = params.slug || [];
  const safeSegments = rawSegments.filter((segment) =>
    segment && segment !== '.' && segment !== '..' && !segment.includes('/') && !segment.includes('\\')
  );

  if (safeSegments.length > 0) {
    const uploadsRoot = path.resolve(getUploadsDir());
    const requestedPath = path.resolve(uploadsRoot, ...safeSegments);

    if (requestedPath.startsWith(uploadsRoot)) {
      try {
        const fileBuffer = await readFile(requestedPath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': getContentType(requestedPath),
            'Cache-Control': 'public, max-age=86400',
          },
        });
      } catch {
        // File does not exist; fall through to placeholder.
      }
    }
  }

  return new NextResponse(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
