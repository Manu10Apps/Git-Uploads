import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyPassword, generateRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit-log';

/**
 * Phase 3: Public User Login Endpoint
 *
 * POST /api/login
 * Body: { email, password }
 *
 * Authenticates a user and returns JWT + refresh tokens
 *
 * Checks:
 * - Email exists
 * - Password matches
 * - Email is verified
 * - Account is not suspended
 *
 * Response:
 * { success: true, token, refreshToken, user: { id, email, name, role } }
 *
 * Errors:
 * - Invalid credentials (200 - generic for security)
 * - Email not verified (403)
 * - Account suspended (403)
 *
 * Rate limited: 5 attempts per 15 minutes per IP
 */

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function checkRateLimit(email: string, ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const key = `user-login:${email}:${ip}`;
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now > attempt.resetTime) {
    return { allowed: true };
  }

  if (attempt.count >= RATE_LIMIT_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((attempt.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

function recordFailedAttempt(email: string, ip: string): void {
  const key = `user-login:${email}:${ip}`;
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now > attempt.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  } else {
    attempt.count++;
  }
}

function clearFailedAttempts(email: string, ip: string): void {
  const key = `user-login:${email}:${ip}`;
  loginAttempts.delete(key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const ip = getClientIP(request);

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check rate limit
    const rateCheck = checkRateLimit(email, ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    // Lookup user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!user) {
      recordFailedAttempt(email, ip);
      // Phase 3: Log failed login
      await logAuditEvent('failed_login', 'user', {
        details: { email, reason: 'user_not_found' },
        request,
      });

      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 200 }
      );
    }

    // Verify password
    let passwordMatch = false;
    try {
      passwordMatch = await verifyPassword(password, user.password);
    } catch (error) {
      // Fallback for legacy plain-text passwords
      passwordMatch = password === user.password;
    }

    if (!passwordMatch) {
      recordFailedAttempt(email, ip);
      // Phase 3: Log failed login
      await logAuditEvent('failed_login', 'user', {
        userId: user.id,
        details: { email, reason: 'password_mismatch' },
        request,
      });

      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 200 }
      );
    }

    // Check email verification
    if (user.emailVerified !== true) {
      recordFailedAttempt(email, ip);
      // Phase 3: Log failed login
      await logAuditEvent('failed_login', 'user', {
        userId: user.id,
        details: { email, reason: 'email_not_verified' },
        request,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
        },
        { status: 403 }
      );
    }

    // Check account status
    if (user.status === 'suspended') {
      recordFailedAttempt(email, ip);
      // Phase 3: Log failed login
      await logAuditEvent('failed_login', 'user', {
        userId: user.id,
        details: { email, reason: 'account_suspended' },
        request,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been suspended. Contact support for help.',
          code: 'ACCOUNT_SUSPENDED',
        },
        { status: 403 }
      );
    }

    // Clear rate limit on successful login
    clearFailedAttempts(email, ip);

    // Generate tokens
    const token = generateToken(user.id);
    const refreshTokenString = generateRefreshToken();
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store refresh token
    try {
      await prisma.userRefreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenString,
          expiresAt: refreshTokenExpiresAt,
        },
      });
    } catch (tokenError) {
      console.warn('Failed to store refresh token:', tokenError);
    }

    // Phase 3: Log successful login
    await logAuditEvent('login', 'user', {
      userId: user.id,
      details: { email },
      request,
    });

    return NextResponse.json(
      {
        success: true,
        token,  // Access token (4h expiry)
        refreshToken: refreshTokenString,  // Refresh token (30d expiry)
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'User login endpoint. Use POST with email and password.',
    },
    { status: 200 }
  );
}
