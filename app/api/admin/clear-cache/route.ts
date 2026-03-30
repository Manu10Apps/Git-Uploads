import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import type { PrismaClient } from '@prisma/client';
import { logAdminAuditEvent } from '@/lib/admin-audit-log';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = new Set(['admin', 'sub-admin', 'sub admin', 'editor']);
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

type CacheTaskResult = {
  name: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
};

function normalizeRole(role: string | null | undefined) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, ' ');
}

function toCacheErrorResponse(error: unknown) {
  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  const message = error instanceof Error ? error.message : String(error || '');

  const isDatabaseNotReady =
    ['P1000', 'P1001', 'P1002', 'P1008', 'P1017', 'P2021', 'P2022', 'P2023', 'P2024'].includes(prismaCode) ||
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
    console.error('Prisma initialization error in clear-cache route:', error);
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

function getCookieValue(request: NextRequest, name: string) {
  return request.cookies.get(name)?.value || '';
}

function isSameOriginRequest(request: NextRequest) {
  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');
  const expectedOrigin = request.nextUrl.origin;

  if (!originHeader && !refererHeader) {
    return false;
  }

  if (originHeader && originHeader !== expectedOrigin) {
    return false;
  }

  if (refererHeader) {
    try {
      const referer = new URL(refererHeader);
      if (referer.origin !== expectedOrigin) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

function isCsrfTokenValid(request: NextRequest) {
  const headerToken = request.headers.get('x-csrf-token') || '';
  const cookieToken = getCookieValue(request, 'admin_csrf_token');

  if (!headerToken || !cookieToken) {
    return false;
  }

  if (headerToken.length < 20 || cookieToken.length < 20) {
    return false;
  }

  return headerToken === cookieToken;
}

function checkRateLimit(identity: string) {
  const now = Date.now();
  const current = rateLimitStore.get(identity);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(identity, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true as const, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false as const, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  rateLimitStore.set(identity, current);

  return {
    allowed: true as const,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count),
    resetAt: current.resetAt,
  };
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

  if (!requester || !ALLOWED_ROLES.has(normalizeRole(requester.role))) {
    return { error: 'Only admin, sub-admin, and editor users can clear cache', status: 403 as const };
  }

  return { requester };
}

async function purgeCloudflareCdn(): Promise<CacheTaskResult> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !token) {
    return {
      name: 'cdn_cache',
      status: 'skipped',
      message: 'Cloudflare credentials not configured',
    };
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ purge_everything: true }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return {
        name: 'cdn_cache',
        status: 'failed',
        message: `Cloudflare purge failed (${response.status}): ${bodyText.substring(0, 180)}`,
      };
    }

    return {
      name: 'cdn_cache',
      status: 'success',
      message: 'Cloudflare purge requested successfully',
    };
  } catch (error) {
    return {
      name: 'cdn_cache',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Cloudflare purge request failed',
    };
  }
}

async function clearExternalQueryCache(): Promise<CacheTaskResult> {
  const purgeUrl = process.env.QUERY_CACHE_PURGE_URL;
  const purgeToken = process.env.QUERY_CACHE_PURGE_TOKEN;

  if (!purgeUrl) {
    return {
      name: 'database_query_cache',
      status: 'skipped',
      message: 'No external query cache purge URL configured',
    };
  }

  try {
    const response = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(purgeToken ? { Authorization: `Bearer ${purgeToken}` } : {}),
      },
      body: JSON.stringify({ action: 'clear-query-cache' }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return {
        name: 'database_query_cache',
        status: 'failed',
        message: `External query cache purge failed (${response.status}): ${bodyText.substring(0, 180)}`,
      };
    }

    return {
      name: 'database_query_cache',
      status: 'success',
      message: 'External query cache purge requested successfully',
    };
  } catch (error) {
    return {
      name: 'database_query_cache',
      status: 'failed',
      message: error instanceof Error ? error.message : 'External query cache purge request failed',
    };
  }
}

async function restartCacheWorkersIfConfigured(): Promise<CacheTaskResult> {
  const workerRestartUrl = process.env.CACHE_WORKER_RESTART_URL;
  const workerRestartToken = process.env.CACHE_WORKER_RESTART_TOKEN;

  if (!workerRestartUrl) {
    return {
      name: 'cache_workers',
      status: 'skipped',
      message: 'No cache worker restart URL configured',
    };
  }

  try {
    const response = await fetch(workerRestartUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerRestartToken ? { Authorization: `Bearer ${workerRestartToken}` } : {}),
      },
      body: JSON.stringify({ action: 'restart-cache-workers' }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      return {
        name: 'cache_workers',
        status: 'failed',
        message: `Cache worker restart failed (${response.status}): ${bodyText.substring(0, 180)}`,
      };
    }

    return {
      name: 'cache_workers',
      status: 'success',
      message: 'Cache worker restart requested successfully',
    };
  } catch (error) {
    return {
      name: 'cache_workers',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Cache worker restart request failed',
    };
  }
}

function clearApplicationAndRouteCaches() {
  const pathsToRevalidate = [
    '/',
    '/home',
    '/breaking',
    '/investigations',
    '/privacy',
    '/terms',
    '/ethics',
    '/search',
    '/analytics',
  ];

  for (const path of pathsToRevalidate) {
    revalidatePath(path);
  }

  revalidateTag('articles');
  revalidateTag('adverts');
  revalidateTag('categories');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
    },
  });
}

export async function POST(request: NextRequest) {
  const startedAt = new Date();
  let actorEmail = request.headers.get('x-admin-email')?.trim().toLowerCase() || 'unknown';
  let actorRole = 'unknown';

  try {
    if (!isSameOriginRequest(request) || !isCsrfTokenValid(request)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: invalid CSRF or origin validation' },
        { status: 403 }
      );
    }

    const prismaResult = await getPrismaSafely();
    if ('errorResponse' in prismaResult) {
      return prismaResult.errorResponse;
    }

    const auth = await getAuthorizedRequester(request, prismaResult.prisma);
    if ('error' in auth) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    actorEmail = auth.requester.email;
    actorRole = auth.requester.role;

    const limit = checkRateLimit(actorEmail);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many cache clear requests. Please wait before retrying.',
          retryAfterSeconds: Math.ceil((limit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      );
    }

    const results: CacheTaskResult[] = [];

    try {
      clearApplicationAndRouteCaches();
      results.push({
        name: 'application_and_route_cache',
        status: 'success',
        message: 'Next.js application and route cache revalidated',
      });
    } catch (error) {
      results.push({
        name: 'application_and_route_cache',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Failed to clear app and route cache',
      });
    }

    results.push(await clearExternalQueryCache());
    results.push(await purgeCloudflareCdn());
    results.push(await restartCacheWorkersIfConfigured());

    const anyFailures = results.some((r) => r.status === 'failed');
    const status = anyFailures ? 'error' : 'success';

    await logAdminAuditEvent({
      action: 'clear_website_cache',
      actorEmail,
      actorRole,
      status,
      details: {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        results,
      },
    });

    return NextResponse.json(
      {
        success: !anyFailures,
        message: anyFailures
          ? 'Cache clear completed with warnings. Review details for failed tasks.'
          : 'Website cache cleared successfully.',
        executedBy: actorEmail,
        executedRole: actorRole,
        executedAt: new Date().toISOString(),
        results,
      },
      { status: anyFailures ? 207 : 200 }
    );
  } catch (error) {
    console.error('Clear cache error:', error);

    await logAdminAuditEvent({
      action: 'clear_website_cache',
      actorEmail,
      actorRole,
      status: 'error',
      details: {
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return toCacheErrorResponse(error);
  }
}
