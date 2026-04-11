import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';
import { getUploadsDir } from '@/lib/upload-config';

export const maxDuration = 60; // Allow up to 60s for PDF uploads on Vercel

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

function getAdminIdFromRequest(req: NextRequest): number | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.adminId ?? null;
}

/**
 * GET /api/epaper
 * List all epaper editions with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const archived = searchParams.get('archived') === 'true';
    const current = searchParams.get('current') === 'true';
    const status = searchParams.get('status'); // 'draft' | 'published' | null (all)
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (archived !== undefined) where.isArchived = archived;
    if (current !== undefined) where.isCurrent = current;
    if (status) where.status = status;

    const [editions, total] = await Promise.all([
      prisma.epaperEdition.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          issueDate: true,
          coverImage: true,
          pdfUrl: true,
          fileSize: true,
          pageCount: true,
          status: true,
          notes: true,
          isCurrent: true,
          createdAt: true,
          admin: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.epaperEdition.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: editions,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching epaper editions:', errorMessage);
    console.error('Full error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch editions', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/epaper
 * Upload a new epaper edition, or save a manual draft (no PDF required).
 * Pass isDraft=true in FormData to create a draft without a PDF file.
 */
export async function POST(req: NextRequest) {
  try {
    const adminId = getAdminIdFromRequest(req);
    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const issueDate = formData.get('issueDate') as string;
    const coverImage = formData.get('coverImage') as string;
    const isDraft = formData.get('isDraft') === 'true';

    if (!title || !issueDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, issueDate' },
        { status: 400 }
      );
    }

    // PDF is required unless saving as draft
    if (!isDraft && !file) {
      return NextResponse.json(
        { success: false, error: 'PDF file is required to publish an edition' },
        { status: 400 }
      );
    }

    // Ensure token belongs to an existing admin user.
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized admin session' },
        { status: 401 }
      );
    }

    // Check if issue date already exists
    const existingEdition = await prisma.epaperEdition.findFirst({
      where: { issueDate: new Date(issueDate) },
    });

    if (existingEdition) {
      return NextResponse.json(
        { success: false, error: 'An edition for this date already exists' },
        { status: 409 }
      );
    }

    let fileUrl: string | null = null;
    let fileSize: number | null = null;

    if (file) {
      // Validate file is PDF
      if (!file.type.includes('pdf')) {
        return NextResponse.json(
          { success: false, error: 'Only PDF files are allowed' },
          { status: 400 }
        );
      }

      if (file.size > MAX_PDF_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'PDF exceeds 25MB limit. Please upload a smaller file.' },
          { status: 413 }
        );
      }

      // Save PDF file to the configured uploads directory (respects UPLOAD_DIR env var)
      const uploadsDir = path.join(getUploadsDir(), 'epaper');
      try {
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }
      } catch (mkdirErr) {
        console.error('Failed to create epaper uploads directory:', mkdirErr);
        return NextResponse.json(
          { success: false, error: 'Server storage not available. Contact administrator.' },
          { status: 500 }
        );
      }

      const fileName = `${new Date(issueDate).getTime()}-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);
      try {
        const buffer = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(buffer));
        fileSize = buffer.byteLength;
      } catch (writeErr) {
        console.error('Failed to write PDF file:', writeErr);
        return NextResponse.json(
          { success: false, error: 'Failed to save PDF file. Check server storage permissions.' },
          { status: 500 }
        );
      }

      fileUrl = `/uploads/epaper/${fileName}`;
    }

    const status = isDraft ? 'draft' : 'published';

    // Create database record
    const edition = await prisma.epaperEdition.create({
      data: {
        title,
        issueDate: new Date(issueDate),
        coverImage: coverImage || null,
        pdfUrl: fileUrl,
        fileSize,
        pageCount: 0,
        status,
        createdBy: adminId,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    // If publishing and no current issue exists, set this as current
    if (!isDraft) {
      const existingCurrent = await prisma.epaperEdition.findFirst({
        where: { isCurrent: true },
      });
      if (!existingCurrent) {
        await prisma.epaperEdition.update({
          where: { id: edition.id },
          data: { isCurrent: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: edition,
      message: isDraft ? 'Draft saved successfully' : 'Edition uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading epaper:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload edition' },
      { status: 500 }
    );
  }
}
