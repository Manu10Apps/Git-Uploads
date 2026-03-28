import { NextRequest, NextResponse } from 'next/server';
import type { PrismaClient } from '@prisma/client';
import { DEFAULT_MAINTENANCE_MESSAGE, getMaintenanceSettings, saveMaintenanceSettings } from '@/lib/maintenance';

const VALID_ROLES = new Set(['admin']);

const DEFAULT_SETTINGS_RESPONSE = {
  enabled: false,
  message: DEFAULT_MAINTENANCE_MESSAGE,
  updatedAt: null,
};

function toMaintenanceErrorResponse(error: unknown) {
  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  const prismaMetaCode =
    typeof error === 'object' && error !== null && 'meta' in error
      ? String(((error as { meta?: { code?: unknown } }).meta?.code as string | undefined) || '')
      : '';

  const message = error instanceof Error ? error.message : String(error || '');

  const isDatabaseNotReady =
    [
      'P1000',
      'P1001',
      'P1002',
      'P1008',
      'P1017',
      'P2010',
      'P2021',
      'P2022',
      'P2023',
      'P2024',
    ].includes(prismaCode) ||
    ['42703', '42704', '42P01', '42P07'].includes(prismaMetaCode) ||
    /no such table|does not exist|unknown column|database is locked|unable to open database file|schema|econnrefused|connection refused|connect timeout|type\s+"datetime"\s+does not exist/i.test(
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
    console.error('Prisma initialization error in maintenance route:', error);
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

  if (!requesterEmail) {
    return { error: 'Unauthorized: missing admin identity', status: 401 as const };
  }

  if (envAdminEmail && requesterEmail === envAdminEmail) {
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

  if (!requester || !VALID_ROLES.has(requester.role)) {
    return { error: 'Only authenticated admin users can manage maintenance mode', status: 403 as const };
  }

  return { requester };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, PUT, OPTIONS',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) {
      return NextResponse.json(
        {
          success: true,
          settings: DEFAULT_SETTINGS_RESPONSE,
          degraded: true,
          message: 'Database unavailable, returned default maintenance settings.',
        },
        { status: 200 }
      );
    }

    try {
      const auth = await getAuthorizedRequester(request, prismaResult.prisma);
      if ('error' in auth) {
        return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
      }

      const settings = await getMaintenanceSettings();
      return NextResponse.json({ success: true, settings }, { status: 200 });
    } catch (authDbError) {
      console.error('Auth or DB error in maintenance GET:', authDbError);
      return NextResponse.json(
        {
          success: true,
          settings: DEFAULT_SETTINGS_RESPONSE,
          degraded: true,
          message: 'Database unavailable, returned default maintenance settings.',
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error('Read maintenance settings error:', error);
    return NextResponse.json(
      {
        success: true,
        settings: DEFAULT_SETTINGS_RESPONSE,
        degraded: true,
        message: 'Database unavailable, returned default maintenance settings.',
      },
      { status: 200 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) {
      return prismaResult.errorResponse;
    }

    const auth = await getAuthorizedRequester(request, prismaResult.prisma);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const enabled = Boolean(body?.enabled);
    const message = String(body?.message || '').trim() || DEFAULT_MAINTENANCE_MESSAGE;

    if (message.length > 500) {
      return NextResponse.json(
        { success: false, message: 'Maintenance message must be 500 characters or fewer' },
        { status: 400 }
      );
    }

    const settings = await saveMaintenanceSettings({ enabled, message });

    return NextResponse.json(
      {
        success: true,
        message: 'Maintenance settings saved successfully',
        settings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Save maintenance settings error:', error);
    return toMaintenanceErrorResponse(error);
  }
}