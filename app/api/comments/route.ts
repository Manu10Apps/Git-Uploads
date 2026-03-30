import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/comments?slug=<articleSlug>
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ comments: [] }, { status: 200 });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ comments: [] }, { status: 200 });
    }

    const comments = await prisma.comment.findMany({
      where: { articleId: article.id },
      select: { id: true, name: true, content: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ error: 'Habaye ikosa' }, { status: 500 });
  }
}

// POST /api/comments?slug=<articleSlug>
export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'Inkuru ntiyabonetse' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Inyandiko si yo' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).name !== 'string' ||
    typeof (body as Record<string, unknown>).email !== 'string' ||
    typeof (body as Record<string, unknown>).comment !== 'string'
  ) {
    return NextResponse.json({ error: 'Uzuza ibibanza byose' }, { status: 400 });
  }

  const { name, email, comment } = body as { name: string; email: string; comment: string };

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedComment = comment.trim();

  if (trimmedName.length < 3 || trimmedName.length > 50) {
    return NextResponse.json({ error: 'Izina rigomba kuba intera 3-50' }, { status: 400 });
  }
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(trimmedEmail)) {
    return NextResponse.json({ error: 'Imeli si yo' }, { status: 400 });
  }
  if (trimmedComment.length < 5 || trimmedComment.length > 2000) {
    return NextResponse.json({ error: 'Igitekerezo kigomba kuba intera 5-2000' }, { status: 400 });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json({ error: 'Inkuru ntiyabonetse' }, { status: 404 });
    }

    const newComment = await prisma.comment.create({
      data: {
        articleId: article.id,
        name: trimmedName,
        email: trimmedEmail,
        content: trimmedComment,
      },
      select: { id: true, name: true, content: true, createdAt: true },
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Habaye ikosa' }, { status: 500 });
  }
}
