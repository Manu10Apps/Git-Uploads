import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const adminEmail = request.headers.get('x-admin-email');
    if (!adminEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { epaperId, action } = body; // action: "lock" | "unlock"

    if (!epaperId || !action || !['lock', 'unlock'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. epaperId and action (lock/unlock) required.' },
        { status: 400 }
      );
    }

    const epaper = await prisma.epaperEdition.findUnique({
      where: { id: parseInt(epaperId) },
    });

    if (!epaper) {
      return NextResponse.json({ error: 'E-paper not found' }, { status: 404 });
    }

    const isLocked = action === 'lock';
    const updatedEpaper = await prisma.epaperEdition.update({
      where: { id: parseInt(epaperId) },
      data: { isLocked },
      select: {
        id: true,
        title: true,
        isLocked: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `E-paper ${action}ed successfully`,
      data: updatedEpaper,
    });
  } catch (error) {
    console.error('Lock e-paper error:', error);
    return NextResponse.json(
      { error: 'Failed to lock/unlock e-paper' },
      { status: 500 }
    );
  }
}
