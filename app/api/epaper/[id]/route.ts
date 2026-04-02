import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';
import { verifyToken } from '@/lib/auth';

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
    const body = await req.json();
    const { title, coverImage, isCurrent } = body;

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
        ...(coverImage && { coverImage }),
        ...(isCurrent !== undefined && { isCurrent }),
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
