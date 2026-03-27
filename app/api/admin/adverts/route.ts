import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface AdvertResponse {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  position: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function toAdvertResponse(advert: any): AdvertResponse {
  return {
    id: String(advert.id),
    title: advert.title,
    url: advert.url || '',
    imageUrl: advert.imageUrl,
    position: advert.position,
    isActive: advert.isActive,
    createdAt: new Date(advert.createdAt).toISOString(),
    updatedAt: new Date(advert.updatedAt).toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const adverts = await prisma.advert.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: adverts.map(toAdvertResponse),
    });
  } catch (error) {
    console.error('Failed to fetch adverts:', error);
    // Fail-open: keep UI alive even if DB is down
    return NextResponse.json({
      success: true,
      data: [],
      degraded: true,
      message: 'Database unavailable, returned empty advert list.',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, url, imageUrl, position } = body;

    if (!title || !imageUrl || !position) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, imageUrl, and position' },
        { status: 400 }
      );
    }

    const newAdvert = await prisma.advert.create({
      data: {
        title,
        url: url || '',
        imageUrl,
        position,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Advert created successfully',
      data: toAdvertResponse(newAdvert),
    });
  } catch (error) {
    console.error('Failed to create advert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create advert' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, url, imageUrl, position, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Advert ID is required' },
        { status: 400 }
      );
    }

    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid advert ID' },
        { status: 400 }
      );
    }

    // Check if advert exists
    const existing = await prisma.advert.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Advert not found' },
        { status: 404 }
      );
    }

    // Update advert
    const updated = await prisma.advert.update({
      where: { id: parsedId },
      data: {
        ...(title && { title }),
        ...(url !== undefined && { url }),
        ...(imageUrl && { imageUrl }),
        ...(position && { position }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Advert updated successfully',
      data: toAdvertResponse(updated),
    });
  } catch (error) {
    console.error('Failed to update advert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update advert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Advert ID is required' },
        { status: 400 }
      );
    }

    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid advert ID' },
        { status: 400 }
      );
    }

    // Check if advert exists
    const existing = await prisma.advert.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Advert not found' },
        { status: 404 }
      );
    }

    // Delete advert
    await prisma.advert.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({
      success: true,
      message: 'Advert deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete advert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete advert' },
      { status: 500 }
    );
  }
}
