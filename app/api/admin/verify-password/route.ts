import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyPassword, generateRefreshToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// FIX (Phase 1): Simple in-memory rate limiter to prevent brute-force
// Track failed login attempts per IP + email; reset after 15 minutes
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
  const key = `${email}:${ip}`;
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now > attempt.resetTime) {
    // First attempt or window expired
    return { allowed: true };
  }

  if (attempt.count >= RATE_LIMIT_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((attempt.resetTime - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

function recordFailedAttempt(email: string, ip: string): void {
  const key = `${email}:${ip}`;
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now > attempt.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  } else {
    attempt.count++;
  }
}

function clearFailedAttempts(email: string, ip: string): void {
  const key = `${email}:${ip}`;
  loginAttempts.delete(key);
}

function normalizeCredential(value: string): string {
  // Handles accidental wrapping quotes and trailing newlines/spaces in env secrets.
  return value.replace(/\r?\n/g, '').trim().replace(/^['"]|['"]$/g, '');
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: 'Admin verification endpoint is available. Use POST with email and password.',
    },
    { status: 200 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, POST, OPTIONS',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const normalizedEmail = normalizeCredential(email).toLowerCase();
    const normalizedPassword = normalizeCredential(password);
    const ip = getClientIP(request);

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // FIX (Phase 1): Check rate limit before attempting auth
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

    // --- ENV CREDENTIALS CHECK (always runs, independent of DB) ---
    // This is the authoritative override: if ADMIN_EMAIL + ADMIN_PASSWORD are
    // set on the server and the submitted credentials match, grant access
    // immediately. This ensures login works even when the DB has a stale hash
    // or is unavailable (e.g. SQLite on first deploy).
    const envEmail = normalizeCredential(process.env.ADMIN_EMAIL || '').toLowerCase();
    const envPasswordRaw = normalizeCredential(process.env.ADMIN_PASSWORD || '');
    const envPasswordHash = normalizeCredential(process.env.ADMIN_PASSWORD_HASH || '');
    const configuredEnvPassword = envPasswordHash || envPasswordRaw;
    const envPasswordNormalized = normalizeCredential(configuredEnvPassword);
    const submittedPasswordNormalized = normalizedPassword;

    let envPasswordMatches = false;
    const looksLikeBcryptHash = /^\$2[aby]?\$\d{2}\$/.test(envPasswordNormalized);

    if (looksLikeBcryptHash) {
      try {
        envPasswordMatches = await verifyPassword(password, envPasswordNormalized);
      } catch {
        envPasswordMatches = false;
      }
    } else {
      envPasswordMatches =
        password === configuredEnvPassword ||
        (submittedPasswordNormalized.length > 0 && submittedPasswordNormalized === envPasswordNormalized);
    }

    if (envEmail && configuredEnvPassword && normalizedEmail === envEmail && envPasswordMatches) {
      let envAdminId = 1;

      // Opportunistically align to a real admin user id and heal DB hash.
      try {
        const { prisma } = await import('@/lib/prisma');
        const { hashPassword } = await import('@/lib/auth');
        const user = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
        if (user) {
          envAdminId = user.id;
          const newHash = await hashPassword(password);
          await prisma.adminUser.update({
            where: { email: normalizedEmail },
            data: { password: newHash },
          });
        }
      } catch {
        // Best effort only. Env login should still succeed.
      }

      const token = generateToken(envAdminId);

      // Phase 2: Generate refresh token for env login
      const refreshTokenString = generateRefreshToken();
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      try {
        await prisma.refreshToken.create({
          data: {
            adminUserId: envAdminId,
            token: refreshTokenString,
            expiresAt: refreshTokenExpiresAt,
          },
        });
      } catch {
        // Non-blocking: refresh token optional
      }

      return NextResponse.json(
        {
          success: true,
          token,  // Access token (4h expiry)
          refreshToken: refreshTokenString,  // Phase 2: Refresh token (30d expiry)
          user: {
            id: envAdminId,
            email: envEmail,
            role: 'admin',
            name: 'Admin',
          },
        },
        { status: 200 }
      );
    }

    // Bootstrap fallback for legacy deployments where ADMIN_EMAIL / ADMIN_PASSWORD
    // are not configured yet but the project default admin credentials are in use.
    // This path self-heals the DB record and should be rotated after first login.
    const bootstrapEmail = normalizeCredential(
      process.env.ADMIN_EMAIL || 'ndahayemmanuel@gmail.com'
    ).toLowerCase();
    const bootstrapPassword = normalizeCredential(
      process.env.ADMIN_PASSWORD || 'AdminIRAFASHA@2025'
    );

    if (
      normalizedEmail === bootstrapEmail &&
      normalizedPassword.length > 0 &&
      normalizedPassword === bootstrapPassword
    ) {
      let bootstrapAdminId = 1;
      let bootstrapAdminName = 'IM Admin';

      try {
        const { hashPassword } = await import('@/lib/auth');
        const hashed = await hashPassword(normalizedPassword);

        const admin = await prisma.adminUser.upsert({
          where: { email: bootstrapEmail },
          update: {
            password: hashed,
            name: 'IM Admin',
            role: 'admin',
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpiresAt: null,
          },
          create: {
            email: bootstrapEmail,
            password: hashed,
            name: 'IM Admin',
            role: 'admin',
            emailVerified: true,
          },
        });

        bootstrapAdminId = admin.id;
        bootstrapAdminName = admin.name;
      } catch (bootstrapError) {
        // Keep login available even if DB schema is partially migrated.
        console.warn('Bootstrap admin DB heal failed, continuing with token login:', bootstrapError);
      }

      clearFailedAttempts(normalizedEmail, ip);

      const token = generateToken(bootstrapAdminId);
      const refreshTokenString = generateRefreshToken();
      const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      try {
        await prisma.refreshToken.create({
          data: {
            adminUserId: bootstrapAdminId,
            token: refreshTokenString,
            expiresAt: refreshTokenExpiresAt,
          },
        });
      } catch {
        // Non-blocking: refresh token storage optional
      }

      return NextResponse.json(
        {
          success: true,
          token,
          refreshToken: refreshTokenString,
          user: {
            id: bootstrapAdminId,
            email: bootstrapEmail,
            role: 'admin',
            name: bootstrapAdminName,
          },
        },
        { status: 200 }
      );
    }

    // --- DATABASE CHECK ---
    try {
      const { prisma } = await import('@/lib/prisma');

      let user:
        | {
            id: number;
            email: string;
            password: string;
            role: string;
            name: string;
            emailVerified?: boolean;
            emailVerificationToken?: string | null;
          }
        | null = null;

      try {
        user = await prisma.adminUser.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            password: true,
            role: true,
            name: true,
            emailVerified: true,
            emailVerificationToken: true,
          },
        });
      } catch {
        // Backward compatibility for deployments where the admin_users table
        // has not yet been migrated with email verification columns.
        user = await prisma.adminUser.findUnique({
          where: { email: normalizedEmail },
          select: {
            id: true,
            email: true,
            password: true,
            role: true,
            name: true,
          },
        });
      }

      if (user) {
        let passwordMatch = false;

        try {
          passwordMatch = await verifyPassword(password, user.password);
        } catch (passwordError) {
          // Allow legacy/plain-text seed values without crashing auth flow.
          passwordMatch = normalizedPassword === normalizeCredential(user.password);
          if (!passwordMatch) {
            console.warn('Password verification failed for admin user:', passwordError);
          }
        }

        if (!passwordMatch) {
          // FIX (Phase 1): Record failed attempt for rate limiting
          recordFailedAttempt(email, ip);
          return NextResponse.json(
            { success: false, message: 'Invalid email or password' },
            { status: 200 }
          );
        }

        // FIX: Mandatory email verification — user.emailVerified must be true
        // Previously allowed bypass if token was null; now enforces strict verification
        if (user.emailVerified !== true) {
          // FIX (Phase 1): Record failed attempt for rate limiting
          recordFailedAttempt(email, ip);
          return NextResponse.json(
            {
              success: false,
              message: 'Please verify your email before logging in.',
              code: 'EMAIL_NOT_VERIFIED',
            },
            { status: 403 }
          );
        }

        // FIX (Phase 1): Clear rate limit on successful login
        clearFailedAttempts(email, ip);

        const token = generateToken(user.id);

        // Phase 2: Generate and store refresh token
        const refreshTokenString = generateRefreshToken();
        const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        try {
          await prisma.refreshToken.create({
            data: {
              adminUserId: user.id,
              token: refreshTokenString,
              expiresAt: refreshTokenExpiresAt,
            },
          });
        } catch (tokenError) {
          // Non-blocking: refresh token storage optional
          console.warn('Failed to store refresh token:', tokenError);
        }

        return NextResponse.json(
          {
            success: true,
            token,  // Access token (4h expiry)
            refreshToken: refreshTokenString,  // Phase 2: Refresh token (30d expiry)
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              name: user.name,
            },
          },
          { status: 200 }
        );
      }
    } catch (dbError) {
      // DB can be unavailable before initial migration/seed.
      console.warn('Database auth lookup failed:', dbError);
    }

    return NextResponse.json(
      { success: false, message: 'Invalid email or password' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
