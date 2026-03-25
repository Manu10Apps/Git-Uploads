import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Advert {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  position: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type AdvertRow = {
  id: number;
  title: string;
  url: string | null;
  imageurl: string;
  position: string;
  isactive: boolean | number;
  createdat: Date | string;
  updatedat: Date | string;
};

const ensureAdvertsTable = async () => {
  try {
    // Add a 2-second timeout to prevent hanging
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), 2000)
    );

    await Promise.race([
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS adverts (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT DEFAULT '',
          imageUrl TEXT NOT NULL,
          position TEXT NOT NULL,
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
          updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `),
      timeoutPromise
    ]);
  } catch (error) {
    // Silently fail - we'll return empty data on error
    throw error;
  }
};

const toAdvert = (row: AdvertRow): Advert => ({
  id: String(row.id),
  title: row.title,
  url: row.url || '',
  imageUrl: row.imageurl,
  position: row.position,
  isActive: typeof row.isactive === 'boolean' ? row.isactive : row.isactive === 1,
  createdAt: new Date(row.createdat).toISOString(),
  updatedAt: new Date(row.updatedat).toISOString(),
});

export async function GET(request: NextRequest) {
  try {
    await ensureAdvertsTable();
    const rows = await prisma.$queryRaw<AdvertRow[]>`
      SELECT
        id,
        title,
        url,
        imageUrl as imageurl,
        position,
        isActive as isactive,
        createdAt as createdat,
        updatedAt as updatedat
      FROM adverts
      ORDER BY createdAt DESC
    `;

    const adverts = rows.map(toAdvert);
    return NextResponse.json({
      success: true,
      data: adverts,
    });
  } catch (error) {
    console.error('Failed to fetch adverts:', error);
    // Fail-open for public rendering paths: keep UI alive even if DB is down.
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAdvertsTable();
    const body = await request.json();
    const { title, url, imageUrl, position } = body;

    if (!title || !imageUrl || !position) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, image, and position' },
        { status: 400 }
      );
    }

    await prisma.$executeRaw`
      INSERT INTO adverts (title, url, imageUrl, position, isActive, createdAt, updatedAt)
      VALUES (${title}, ${url || ''}, ${imageUrl}, ${position}, ${true}, ${new Date()}, ${new Date()})
    `;

    const rows = await prisma.$queryRaw<AdvertRow[]>`
      SELECT
        id,
        title,
        url,
        imageUrl as imageurl,
        position,
        isActive as isactive,
        createdAt as createdat,
        updatedAt as updatedat
      FROM adverts
      ORDER BY id DESC
      LIMIT 1
    `;

    const newAdvert = rows[0] ? toAdvert(rows[0]) : null;

    return NextResponse.json({
      success: true,
      message: 'Advert created successfully',
      data: newAdvert,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create advert' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureAdvertsTable();
    const body = await request.json();
    const { id, title, url, imageUrl, position, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Advert ID is required' },
        { status: 400 }
      );
    }

    const parsedId = Number(id);
    if (!Number.isInteger(parsedId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid advert ID' },
        { status: 400 }
      );
    }

    const existing = await prisma.$queryRaw<AdvertRow[]>`
      SELECT
        id,
        title,
        url,
        imageUrl as imageurl,
        position,
        isActive as isactive,
        createdAt as createdat,
        updatedAt as updatedat
      FROM adverts
      WHERE id = ${parsedId}
      LIMIT 1
    `;

    if (!existing[0]) {
      return NextResponse.json(
        { success: false, error: 'Advert not found' },
        { status: 404 }
      );
    }

    const current = toAdvert(existing[0]);

    await prisma.$executeRaw`
      UPDATE adverts
      SET
        title = ${title || current.title},
        url = ${url ?? current.url},
        imageUrl = ${imageUrl || current.imageUrl},
        position = ${position || current.position},
        isActive = ${isActive !== undefined ? Boolean(isActive) : current.isActive},
        updatedAt = ${new Date()}
      WHERE id = ${parsedId}
    `;

    const updatedRows = await prisma.$queryRaw<AdvertRow[]>`
      SELECT
        id,
        title,
        url,
        imageUrl as imageurl,
        position,
        isActive as isactive,
        createdAt as createdat,
        updatedAt as updatedat
      FROM adverts
      WHERE id = ${parsedId}
      LIMIT 1
    `;
    const updatedAdvert = updatedRows[0] ? toAdvert(updatedRows[0]) : current;

    return NextResponse.json({
      success: true,
      message: 'Advert updated successfully',
      data: updatedAdvert,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update advert' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureAdvertsTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Advert ID is required' },
        { status: 400 }
      );
    }

    const parsedId = Number(id);
    if (!Number.isInteger(parsedId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid advert ID' },
        { status: 400 }
      );
    }

    const existing = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id
      FROM adverts
      WHERE id = ${parsedId}
      LIMIT 1
    `;

    if (!existing[0]) {
      return NextResponse.json(
        { success: false, error: 'Advert not found' },
        { status: 404 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM adverts
      WHERE id = ${parsedId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Advert deleted successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete advert' },
      { status: 500 }
    );
  }
}
