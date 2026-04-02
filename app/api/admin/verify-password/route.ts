import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyPassword } from '@/lib/auth';

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

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // --- ENV CREDENTIALS CHECK (always runs, independent of DB) ---
    // This is the authoritative override: if ADMIN_EMAIL + ADMIN_PASSWORD are
    // set on the server and the submitted credentials match, grant access
    // immediately. This ensures login works even when the DB has a stale hash
    // or is unavailable (e.g. SQLite on first deploy).
    const envEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const envPasswordRaw = process.env.ADMIN_PASSWORD || '';
    const envPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';
    const configuredEnvPassword = envPasswordHash || envPasswordRaw;
    const envPasswordNormalized = configuredEnvPassword.replace(/\r?\n/g, '').trim();
    const submittedPasswordNormalized = password.replace(/\r?\n/g, '').trim();

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

    if (envEmail && configuredEnvPassword && email === envEmail && envPasswordMatches) {
      let envAdminId = 1;

      // Opportunistically align to a real admin user id and heal DB hash.
      try {
        const { prisma } = await import('@/lib/prisma');
        const { hashPassword } = await import('@/lib/auth');
        const user = await prisma.adminUser.findUnique({ where: { email } });
        if (user) {
          envAdminId = user.id;
          const newHash = await hashPassword(password);
          await prisma.adminUser.update({
            where: { email },
            data: { password: newHash },
          });
        }
      } catch {
        // Best effort only. Env login should still succeed.
      }

      const token = generateToken(envAdminId);

      return NextResponse.json(
        {
          success: true,
          token,
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
          where: { email },
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
          where: { email },
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
          passwordMatch = password === user.password;
          if (!passwordMatch) {
            console.warn('Password verification failed for admin user:', passwordError);
          }
        }

        if (!passwordMatch) {
          return NextResponse.json(
            { success: false, message: 'Invalid email or password' },
            { status: 200 }
          );
        }

        const requiresVerification =
          user.emailVerified === false && Boolean(user.emailVerificationToken);

        if (requiresVerification) {
          return NextResponse.json(
            {
              success: false,
              message: 'Please verify your email before logging in.',
              code: 'EMAIL_NOT_VERIFIED',
            },
            { status: 403 }
          );
        }

        const token = generateToken(user.id);

        return NextResponse.json(
          {
            success: true,
            token,
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
