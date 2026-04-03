import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit-log';

/**
 * Phase 3: Email Verification Endpoint (Generic for Users & Admins)
 *
 * POST /api/verify-email
 * Body: { token }
 * OR
 * GET /api/verify-email?token=...
 *
 * Verifies an email by checking token expiry and marking emailVerified=true
 * Works for both User and AdminUser models
 *
 * Response:
 * { success: true, message: 'Email verified' }
 *
 * Errors:
 * - Invalid/expired token (410 Gone)
 * - User not found (404)
 */

async function verifyEmailToken(token: string, request: NextRequest) {
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Verification token is required' },
      { status: 400 }
    );
  }

  try {
    // Check if it's a user email verification
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: {
          gt: new Date(), // Token not expired
        },
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (user) {
      // Mark user email as verified
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });

      // Phase 3: Log email verification
      await logAuditEvent('verify_email', 'user', {
        userId: user.id,
        details: { email: user.email },
        request,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Email verified successfully. You can now log in.',
          type: 'user',
        },
        { status: 200 }
      );
    }

    // Check if it's an admin email verification
    const adminUser = await prisma.adminUser.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: {
          gt: new Date(), // Token not expired
        },
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });

    if (adminUser) {
      // Mark admin email as verified
      await prisma.adminUser.update({
        where: { id: adminUser.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });

      // Phase 3: Log email verification
      await logAuditEvent('verify_email', 'admin_user', {
        userId: adminUser.id,
        details: { email: adminUser.email },
        request,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Email verified successfully. You can now log in.',
          type: 'admin',
        },
        { status: 200 }
      );
    }

    // Token not found or expired
    return NextResponse.json(
      {
        success: false,
        message: 'Verification link has expired or is invalid. Please request a new one.',
      },
      { status: 410 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = String(body?.token || '').trim();
    return verifyEmailToken(token, request);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  return verifyEmailToken(token, request);
}
