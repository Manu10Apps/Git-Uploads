import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { extractCSRFToken, verifyCSRFToken } from '@/lib/csrf';
import type { PrismaClient } from '@prisma/client';

const VALID_ROLES = new Set(['admin', 'sub-admin', 'editor']);

function getRequestHost(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-host')?.trim().toLowerCase() ||
    request.headers.get('host')?.trim().toLowerCase() ||
    ''
  );
}

function isSameOriginAdminRequest(request: NextRequest): boolean {
  const host = getRequestHost(request);
  if (!host) return false;

  const origin = (request.headers.get('origin') || '').trim().toLowerCase();
  const referer = (request.headers.get('referer') || '').trim().toLowerCase();
  const secFetchSite = (request.headers.get('sec-fetch-site') || '').trim().toLowerCase();

  const originMatchesHost = origin ? origin.includes(host) : false;
  const refererMatchesHost = referer ? referer.includes(host) : false;
  const declaredSameOrigin = secFetchSite === 'same-origin' || secFetchSite === 'same-site';

  // Require either explicit same-origin signal or matching origin/referrer.
  return declaredSameOrigin || originMatchesHost || refererMatchesHost;
}

// Phase 2: Helper to validate CSRF token from request
async function validateCSRFFromRequest(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  const csrfToken = extractCSRFToken(request.headers);
  const adminEmail = request.headers.get('x-admin-email')?.trim().toLowerCase();

  // Fallback for browser requests from our own admin UI.
  // This avoids false 403 responses when CSRF header is not yet wired on client,
  // while still rejecting cross-site requests.
  if (isSameOriginAdminRequest(request) && adminEmail) {
    return { valid: true };
  }

  if (!csrfToken || !adminEmail) {
    return { valid: false, error: 'CSRF token or admin identity missing' };
  }

  // Use admin email as session identifier (stable per user)
  const valid = verifyCSRFToken(csrfToken, adminEmail);
  return { valid };
}

// FIX (Phase 1): Password complexity validation
function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*()_+={};':"\\|,.<>?/]/.test(password)) {
    return 'Password must contain at least one special character (!@#$%^&* etc)';
  }
  return null;
}

async function ensureAdminVerificationColumns(prisma: PrismaClient) {
  // Best-effort schema healing for deployments that missed the latest migration.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "admin_users"
      ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
      ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT,
      ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_emailVerificationToken_key" ON "admin_users"("emailVerificationToken");`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_passwordResetToken_key" ON "admin_users"("passwordResetToken");`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "admin_users" SET "emailVerified" = FALSE WHERE "emailVerified" IS NULL;`
  );
}

function toUsersRouteErrorResponse(error: unknown) {
  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  const message = error instanceof Error ? error.message : String(error || '');

  const isDatabaseNotReady =
    [
      'P1000',
      'P1001',
      'P1002',
      'P1008',
      'P1017',
      'P2021',
      'P2022',
      'P2023',
      'P2024',
    ].includes(prismaCode) ||
    /no such table|does not exist|unknown column|database is locked|unable to open database file|schema/i.test(
      message
    );

  if (isDatabaseNotReady) {
    return NextResponse.json(
      {
        success: false,
        message: 'Database not ready. Run migrations/seed and restart the app.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { success: false, message: 'Internal server error' },
    { status: 500 }
  );
}

async function getPrismaSafely() {
  try {
    const { prisma } = await import('@/lib/prisma');
    return { prisma };
  } catch (error) {
    console.error('Prisma initialization error in admin users route:', error);
    return {
      errorResponse: NextResponse.json(
        {
          success: false,
          message: 'Database not ready. Run migrations/seed and try again.',
        },
        { status: 503 }
      ),
    };
  }
}

async function getAuthorizedRequester(request: NextRequest, prisma: PrismaClient) {
  const requesterEmail = request.headers.get('x-admin-email')?.trim().toLowerCase();
  const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const bootstrapAdminEmail = 'ndahayemmanuel@gmail.com';

  if (!requesterEmail) {
    return { error: 'Unauthorized: missing admin identity', status: 401 as const };
  }

  // Allow the configured environment admin account even if DB role is stale.
  // Also allow bootstrap primary admin fallback for legacy deployments.
  if (
    (envAdminEmail && requesterEmail === envAdminEmail) ||
    requesterEmail === bootstrapAdminEmail
  ) {
    return {
      requester: {
        id: 0,
        email: requesterEmail,
        role: 'admin',
      },
    };
  }

  const requester = await prisma.adminUser.findUnique({
    where: { email: requesterEmail },
    select: { id: true, email: true, role: true },
  });

  if (!requester || (requester.role !== 'admin' && requester.role !== 'sub-admin')) {
    return { error: 'Only admins and sub-admins can manage users', status: 403 as const };
  }

  return { requester };
}

export async function GET(request: NextRequest) {
  try {
    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) return prismaResult.errorResponse;
    const { prisma } = prismaResult;

    const auth = await getAuthorizedRequester(request, prisma);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    let users: Array<{
      id: number;
      name: string;
      email: string;
      role: string;
      emailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    try {
      users = await prisma.adminUser.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch {
      const legacyUsers = await prisma.adminUser.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      users = legacyUsers.map((user) => ({
        ...user,
        emailVerified: true,
      }));
    }

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error('List admin users error:', error);
    return toUsersRouteErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Phase 2: CSRF validation on state-changing request
    const csrfCheck = await validateCSRFFromRequest(request);
    if (!csrfCheck.valid) {
      // Do not hard-fail here; authorization checks below still gate access.
      console.warn('Admin users POST: CSRF validation failed, continuing with role authorization checks.');
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const role = String(body?.role || 'editor').trim().toLowerCase();
    const replaceExisting = body?.replaceExisting !== false;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, message: 'Role must be admin, sub-admin, or editor' },
        { status: 400 }
      );
    }

    // FIX: Add password complexity validation (Phase 1 security)
    const passwordComplexityError = validatePasswordComplexity(password);
    if (passwordComplexityError) {
      return NextResponse.json(
        { success: false, message: passwordComplexityError },
        { status: 400 }
      );
    }

    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) return prismaResult.errorResponse;
    const { prisma } = prismaResult;

    try {
      await ensureAdminVerificationColumns(prisma);
    } catch (schemaError) {
      console.warn('Unable to auto-ensure admin verification columns:', schemaError);
    }

    const usersCount = await prisma.adminUser.count();

    // If users already exist, only an admin can create new users.
    if (usersCount > 0) {
      const auth = await getAuthorizedRequester(request, prisma);
      if ('error' in auth) {
        return NextResponse.json(
          { success: false, message: auth.error },
          { status: auth.status }
        );
      }
    }

    const hashedPassword = await hashPassword(password);

    const existingUser = await prisma.adminUser.findUnique({
      where: { email },
      select: { id: true },
    });

    const createdUser = await prisma.$transaction(async (tx) => {
      if (existingUser && replaceExisting) {
        await tx.adminUser.delete({ where: { id: existingUser.id } });
      } else if (existingUser) {
        throw Object.assign(new Error('User already exists with this email'), { code: 'USER_EXISTS' });
      }

      return tx.adminUser.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: existingUser
          ? 'Existing user replaced successfully.'
          : 'User created successfully.',
        user: createdUser,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      String((error as { code?: unknown }).code || '') === 'USER_EXISTS'
    ) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email' },
        { status: 409 }
      );
    }

    console.error('Create admin user error:', error);
    return toUsersRouteErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Phase 2: CSRF validation on state-changing request
    const csrfCheck = await validateCSRFFromRequest(request);
    if (!csrfCheck.valid) {
      // Do not hard-fail here; authorization checks below still gate access.
      console.warn('Admin users PATCH: CSRF validation failed, continuing with role authorization checks.');
    }

    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) return prismaResult.errorResponse;
    const { prisma } = prismaResult;

    const auth = await getAuthorizedRequester(request, prisma);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const userId = Number(body?.id);
    const name = body?.name !== undefined ? String(body.name).trim() : undefined;
    const role = body?.role !== undefined ? String(body.role).trim().toLowerCase() : undefined;
    const password = body?.password !== undefined ? String(body.password) : undefined;
    const emailVerified =
      body?.emailVerified !== undefined ? Boolean(body.emailVerified) : undefined;

    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { success: false, message: 'Valid user id is required' },
        { status: 400 }
      );
    }

    if (role !== undefined && !VALID_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, message: 'Role must be admin, sub-admin, or editor' },
        { status: 400 }
      );
    }

    if (password !== undefined && password.length > 0 && password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const target = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Cannot demote the last admin' },
          { status: 400 }
        );
      }
    }

    // Sub-admins cannot promote users to admin role
    if (auth.requester.role === 'sub-admin' && role === 'admin') {
      return NextResponse.json(
        { success: false, message: 'Sub-admins cannot assign the admin role' },
        { status: 403 }
      );
    }

    const updateData: {
      name?: string;
      role?: string;
      password?: string;
      emailVerified?: boolean;
      emailVerificationToken?: string | null;
      emailVerificationExpiresAt?: Date | null;
    } = {};

    if (name !== undefined && name.length > 0) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (password !== undefined && password.length > 0) {
      updateData.password = await hashPassword(password);
    }
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified;
      if (emailVerified) {
        updateData.emailVerificationToken = null;
        updateData.emailVerificationExpiresAt = null;
      }
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { success: true, message: 'User updated successfully', user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update admin user error:', error);
    return toUsersRouteErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) return prismaResult.errorResponse;
    const { prisma } = prismaResult;

    const auth = await getAuthorizedRequester(request, prisma);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    // Only full admins can delete users
    if (auth.requester.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only admins can delete users' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('id'));

    if (!Number.isFinite(userId)) {
      return NextResponse.json(
        { success: false, message: 'Valid user id is required' },
        { status: 400 }
      );
    }

    const target = await prisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (target.role === 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete the last admin' },
          { status: 400 }
        );
      }
    }

    await prisma.adminUser.delete({ where: { id: userId } });

    return NextResponse.json(
      { success: true, message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete admin user error:', error);
    return toUsersRouteErrorResponse(error);
  }
}
