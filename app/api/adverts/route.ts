import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const db = prisma as any;
    const adverts = await db.advert.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      {
        success: true,
        data: adverts.map(toAdvertResponse),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch public adverts:', error);
    return NextResponse.json({
      success: true,
      data: [],
      degraded: true,
      message: 'Database unavailable, returned empty advert list.',
    });
  }
}
