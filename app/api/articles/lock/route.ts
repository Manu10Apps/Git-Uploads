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
    const { articleId, action } = body; // action: "lock" | "unlock"

    if (!articleId || !action || !['lock', 'unlock'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request. articleId and action (lock/unlock) required.' },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id: parseInt(articleId) },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const locked = action === 'lock';
    const updatedArticle = await prisma.article.update({
      where: { id: parseInt(articleId) },
      data: { locked },
      select: {
        id: true,
        title: true,
        locked: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Article ${action}ed successfully`,
      data: updatedArticle,
    });
  } catch (error) {
    console.error('Lock article error:', error);
    return NextResponse.json(
      { error: 'Failed to lock/unlock article' },
      { status: 500 }
    );
  }
}
