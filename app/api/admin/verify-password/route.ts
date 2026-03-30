import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';

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
    const envPasswordNormalized = envPasswordRaw.replace(/\r?\n/g, '').trim();
    const submittedPasswordNormalized = password.replace(/\r?\n/g, '').trim();

    const envPasswordMatches =
      password === envPasswordRaw ||
      (submittedPasswordNormalized.length > 0 && submittedPasswordNormalized === envPasswordNormalized);

    if (envEmail && envPasswordRaw && email === envEmail && envPasswordMatches) {
      // Opportunistically heal the DB hash in the background so future bcrypt
      // checks pass, but do NOT block the login response on this.
      (async () => {
        try {
          const { prisma } = await import('@/lib/prisma');
          const { hashPassword } = await import('@/lib/auth');
          const user = await prisma.adminUser.findUnique({ where: { email } });
          if (user) {
            const newHash = await hashPassword(password);
            await prisma.adminUser.update({
              where: { email },
              data: { password: newHash },
            });
          }
        } catch {
          // best-effort only – ignore errors
        }
      })();

      return NextResponse.json(
        {
          success: true,
          user: {
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

      const user = await prisma.adminUser.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          name: true,
          emailVerified: true,
        },
      });

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

        if (!user.emailVerified) {
          return NextResponse.json(
            {
              success: false,
              message: 'Please verify your email before logging in.',
              code: 'EMAIL_NOT_VERIFIED',
            },
            { status: 403 }
          );
        }

        return NextResponse.json(
          {
            success: true,
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
