import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PublicCommentNode = {
  id: number;
  name: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt: Date;
  visitorReaction: string | null;
  replies: PublicCommentNode[];
};

type InternalCommentNode = {
  id: number;
  name: string;
  content: string;
  likes: number;
  dislikes: number;
  createdAt: Date;
  visitorReaction: string | null;
  replies: InternalCommentNode[];
  parentId: number | null;
};

function getVisitorId(req: NextRequest) {
  return req.cookies.get('commentVisitorId')?.value || null;
}

function applyVisitorCookie(response: NextResponse, visitorId: string) {
  response.cookies.set('commentVisitorId', visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
}

// GET /api/comments?slug=<articleSlug>
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const visitorId = getVisitorId(req);
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
      select: {
        id: true,
        parentId: true,
        name: true,
        content: true,
        likes: true,
        dislikes: true,
        createdAt: true,
        votes: visitorId
          ? {
              where: { visitorId },
              select: { reaction: true },
            }
          : undefined,
      },
      orderBy: { createdAt: 'asc' },
    });

    const commentMap = new Map<number, InternalCommentNode>();

    for (const comment of comments) {
      commentMap.set(comment.id, {
        id: comment.id,
        parentId: comment.parentId,
        name: comment.name,
        content: comment.content,
        likes: comment.likes,
        dislikes: comment.dislikes,
        createdAt: comment.createdAt,
        visitorReaction: comment.votes?.[0]?.reaction || null,
        replies: [],
      });
    }

    const normalizedComments = Array.from(commentMap.values()).reduce<InternalCommentNode[]>((roots, comment) => {
      if (comment.parentId === null) {
        roots.push(comment);
        return roots;
      }

      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }

      return roots;
    }, []);

    const stripParentId = (items: InternalCommentNode[]): PublicCommentNode[] =>
      items.map(({ parentId: _parentId, replies, ...comment }) => ({
        ...comment,
        replies: stripParentId(replies),
      }));

    return NextResponse.json({ comments: stripParentId(normalizedComments) });
  } catch (error) {
    console.error('[Comments GET Error]', error instanceof Error ? error.message : String(error));
    // Return empty comments instead of error to avoid breaking the page
    return NextResponse.json({ comments: [] }, { status: 200 });
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

  const { name, email, comment, parentId } = body as {
    name: string;
    email: string;
    comment: string;
    parentId?: number;
  };

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedComment = comment.trim();

  if (trimmedName.length < 3 || trimmedName.length > 50) {
    return NextResponse.json({ error: 'Izina rigomba kuba intera 3-50' }, { status: 400 });
  }
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmedEmail)) {
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

    if (typeof parentId !== 'undefined') {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentId,
          articleId: article.id,
        },
        select: { id: true },
      });

      if (!parentComment) {
        return NextResponse.json({ error: 'Igitekerezo musubizaho ntikibashije kuboneka' }, { status: 404 });
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        articleId: article.id,
        parentId: typeof parentId === 'number' ? parentId : null,
        name: trimmedName,
        email: trimmedEmail,
        content: trimmedComment,
      },
      select: { id: true, name: true, content: true, likes: true, dislikes: true, createdAt: true, parentId: true },
    });

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Comments POST Error]', errorMsg);
    
    // Check if it's a table not found error
    if (errorMsg.includes('relation "comments" does not exist') || 
        errorMsg.includes('Unknown table') ||
        errorMsg.includes('no such table')) {
      console.error('[Comments] Table does not exist. Run migrations on production.');
      return NextResponse.json({ 
        error: 'Igitekerezo si rimwe mu myanda. Ongera ugerageze.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: 'Habaye ikosa' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Inyandiko si yo' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).commentId !== 'number' ||
    !['like', 'dislike'].includes(String((body as Record<string, unknown>).reaction || ''))
  ) {
    return NextResponse.json({ error: 'Ubusabe si bwo' }, { status: 400 });
  }

  const { commentId, reaction } = body as { commentId: number; reaction: 'like' | 'dislike' };
  const cookieVisitorId = getVisitorId(req);
  const visitorId = cookieVisitorId || crypto.randomUUID();

  try {
    const updatedComment = await prisma.$transaction(async (tx) => {
      const existingVote = await tx.commentVote.findUnique({
        where: {
          commentId_visitorId: {
            commentId,
            visitorId,
          },
        },
      });

      if (!existingVote) {
        await tx.commentVote.create({
          data: {
            commentId,
            visitorId,
            reaction,
          },
        });

        return tx.comment.update({
          where: { id: commentId },
          data: reaction === 'like' ? { likes: { increment: 1 } } : { dislikes: { increment: 1 } },
          select: { id: true, likes: true, dislikes: true, parentId: true },
        });
      }

      if (existingVote.reaction === reaction) {
        return tx.comment.findUnique({
          where: { id: commentId },
          select: { id: true, likes: true, dislikes: true, parentId: true },
        });
      }

      await tx.commentVote.update({
        where: {
          commentId_visitorId: {
            commentId,
            visitorId,
          },
        },
        data: { reaction },
      });

      return tx.comment.update({
        where: { id: commentId },
        data:
          reaction === 'like'
            ? { likes: { increment: 1 }, dislikes: { decrement: 1 } }
            : { likes: { decrement: 1 }, dislikes: { increment: 1 } },
        select: { id: true, likes: true, dislikes: true, parentId: true },
      });
    });

    const response = NextResponse.json(
      {
        comment: {
          ...updatedComment,
          visitorReaction: reaction,
        },
      },
      { status: 200 }
    );

    if (!cookieVisitorId) {
      applyVisitorCookie(response, visitorId);
    }

    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Comments PATCH Error]', errorMsg);
    return NextResponse.json({ error: 'Habaye ikosa' }, { status: 500 });
  }
}
