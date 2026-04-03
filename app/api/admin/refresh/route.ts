import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Phase 2: Token Refresh Endpoint
 *
 * Accepts a refresh token and returns a new access token.
 * Refresh tokens are:
 * - Valid for 30 days
 * - Can be revoked (soft delete via revokedAt)
 * - Tied to an AdminUser and checked against database
 *
 * Usage: POST /api/admin/refresh
 * Body: { refreshToken: "..." }
 *
 * Response on success:
 * { success: true, token: "new_access_token" }
 *
 * Response on failure:
 * { success: false, message: "Invalid or expired refresh token" }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const refreshTokenString = String(body?.refreshToken || '').trim();

    if (!refreshTokenString) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Lookup refresh token in database
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
      include: { adminUser: true },
    });

    // Validate: token exists, not revoked, not expired
    if (
      !refreshToken ||
      refreshToken.revokedAt !== null ||
      refreshToken.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Validate: user still exists and is verified
    if (!refreshToken.adminUser.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          message: 'User email is not verified',
        },
        { status: 403 }
      );
    }

    // Generate new access token (4h expiry)
    const newAccessToken = generateToken(refreshToken.adminUserId);

    return NextResponse.json(
      {
        success: true,
        token: newAccessToken,  // New access token
        user: {
          id: refreshToken.adminUser.id,
          email: refreshToken.adminUser.email,
          role: refreshToken.adminUser.role,
          name: refreshToken.adminUser.name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Revoke a refresh token (logout)
 * Query: ?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const refreshTokenString = request.nextUrl.searchParams.get('token')?.trim();

    if (!refreshTokenString) {
      return NextResponse.json(
        { success: false, message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Soft-delete by marking as revoked
    await prisma.refreshToken.update({
      where: { token: refreshTokenString },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json(
      { success: true, message: 'Refresh token revoked (logged out)' },
      { status: 200 }
    );
  } catch (error) {
    // Token may not exist; still respond success for security
    console.warn('Token revocation error:', error);
    return NextResponse.json(
      { success: true, message: 'Token revocation processed' },
      { status: 200 }
    );
  }
}
