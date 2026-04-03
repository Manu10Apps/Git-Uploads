import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { generateSecureToken, sendAdminPasswordResetEmail } from '@/lib/admin-account';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
  }

  const action = String((body as { action?: string })?.action || '').trim();

  if (action === 'request') {
    const email = String((body as { email?: string })?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Return a clear operational error instead of pretending an email was sent.
    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Password reset email is currently unavailable because email service is not configured. Contact support.',
        },
        { status: 503 }
      );
    }

    try {
      const user = await prisma.adminUser.findUnique({
        where: { email },
        select: { id: true, email: true, name: true },
      });

      if (user) {
        const token = generateSecureToken();
        const expires = new Date(Date.now() + 1000 * 60 * 30);

        await prisma.adminUser.update({
          where: { id: user.id },
          data: {
            passwordResetToken: token,
            passwordResetExpiresAt: expires,
          },
        });

        await sendAdminPasswordResetEmail(user.email, user.name, token);
      }

      return NextResponse.json(
        {
          success: true,
          message: 'If that email exists, a password reset link has been sent.',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Password reset request error:', error);
      return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
  }

  if (action === 'confirm') {
    const token = String((body as { token?: string })?.token || '').trim();
    const password = String((body as { password?: string })?.password || '');

    if (!token || !password) {
      return NextResponse.json({ success: false, message: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, message: 'Password must be at least 8 characters' }, { status: 400 });
    }

    try {
      const user = await prisma.adminUser.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiresAt: {
            gt: new Date(),
          },
        },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json({ success: false, message: 'Invalid or expired reset link' }, { status: 400 });
      }

      const hashed = await hashPassword(password);
      await prisma.adminUser.update({
        where: { id: user.id },
        data: {
          password: hashed,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      });

      return NextResponse.json({ success: true, message: 'Password changed successfully' }, { status: 200 });
    } catch (error) {
      console.error('Password reset confirm error:', error);
      return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
}
