import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();

  if (!token) {
    return NextResponse.json({ success: false, message: 'Missing verification token' }, { status: 400 });
  }

  try {
    const now = new Date();

    const user = await prisma.adminUser.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: {
          gt: now,
        },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification link' },
        { status: 400 }
      );
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Email verified successfully' }, { status: 200 });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
