import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';
import { getUploadsDir } from '@/lib/upload-config';

const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024;

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;
  return Boolean(verifyToken(token));
}

/**
 * GET /api/epaper/[id]
 * Get a specific epaper edition
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    const edition = await prisma.epaperEdition.findUnique({
      where: { id },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    if (!edition) {
      return NextResponse.json(
        { success: false, error: 'Edition not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: edition,
    });
  } catch (error) {
    console.error('Error fetching edition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch edition' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/epaper/[id]
 * Update epaper edition metadata (mark as current, etc.)
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const id = parseInt(params.id);

    const contentType = req.headers.get('content-type') || '';

    // Support multipart/form-data for publishing a draft with PDF upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const title = formData.get('title') as string | null;
      const coverImage = formData.get('coverImage') as string | null;
      const publish = formData.get('publish') === 'true';

      const existing = await prisma.epaperEdition.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
      }

      let fileUrl: string | null = existing.pdfUrl;
      let fileSize: number | null = existing.fileSize ?? null;

      if (file) {
        if (!file.type.includes('pdf')) {
          return NextResponse.json(
            { success: false, error: 'Only PDF files are allowed' },
            { status: 400 }
          );
        }
        if (file.size > MAX_PDF_SIZE_BYTES) {
          return NextResponse.json(
            { success: false, error: 'PDF exceeds 25MB limit' },
            { status: 413 }
          );
        }

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

        const fileName = `${new Date(existing.issueDate).getTime()}-${(title || existing.title).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        try {
          const buffer = await file.arrayBuffer();
          await writeFile(filePath, Buffer.from(buffer));
          fileUrl = `/uploads/epaper/${fileName}`;
          fileSize = buffer.byteLength;
        } catch (writeErr) {
          console.error('Failed to write PDF file:', writeErr);
          return NextResponse.json(
            { success: false, error: 'Failed to save PDF file. Check server storage permissions.' },
            { status: 500 }
          );
        }
      }

      if (publish && !fileUrl) {
        return NextResponse.json(
          { success: false, error: 'Cannot publish: no PDF uploaded for this draft' },
          { status: 400 }
        );
      }

      const edition = await prisma.epaperEdition.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(coverImage && { coverImage }),
          ...(fileUrl && { pdfUrl: fileUrl }),
          ...(fileSize && { fileSize }),
          ...(publish && { status: 'published' }),
        },
        include: { admin: { select: { id: true, name: true, email: true } } },
      });

      return NextResponse.json({
        success: true,
        data: edition,
        message: publish ? 'Draft published successfully' : 'Draft updated successfully',
      });
    }

    // JSON body — metadata update (mark as current, title, cover, publish status)
    const body = await req.json();
    const { title, coverImage, isCurrent, status, issueDate, pageCount, notes } = body;

    // Publishing a draft via JSON (no PDF change)
    if (status === 'published') {
      const existing = await prisma.epaperEdition.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Edition not found' }, { status: 404 });
      }
      if (!existing.pdfUrl) {
        return NextResponse.json(
          { success: false, error: 'Cannot publish: no PDF uploaded for this draft' },
          { status: 400 }
        );
      }
    }

    // If marking as current, unmark all others
    if (isCurrent === true) {
      await prisma.epaperEdition.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const edition = await prisma.epaperEdition.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(coverImage !== undefined && { coverImage: coverImage || null }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(status && { status }),
        ...(issueDate && { issueDate: new Date(issueDate) }),
        ...(pageCount !== undefined && { pageCount: Number(pageCount) }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: edition,
      message: 'Edition updated successfully',
    });
  } catch (error) {
    console.error('Error updating edition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update edition' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/epaper/[id]
 * Soft delete (archive) or hard delete an edition
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const id = parseInt(params.id);
    const searchParams = req.nextUrl.searchParams;
    const hardDelete = searchParams.get('hard') === 'true';

    const edition = await prisma.epaperEdition.findUnique({
      where: { id },
    });

    if (!edition) {
      return NextResponse.json(
        { success: false, error: 'Edition not found' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Delete file and database record
      if (edition.pdfUrl) {
        try {
          const filePath = path.join(process.cwd(), 'public', edition.pdfUrl);
          await unlink(filePath);
        } catch (err) {
          console.warn('Could not delete file:', edition.pdfUrl);
        }
      }

      await prisma.epaperEdition.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Edition permanently deleted',
      });
    } else {
      // Soft delete (archive)
      const updated = await prisma.epaperEdition.update({
        where: { id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
        include: {
          admin: { select: { id: true, name: true, email: true } },
        },
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Edition archived successfully',
      });
    }
  } catch (error) {
    console.error('Error deleting edition:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete edition' },
      { status: 500 }
    );
  }
}
