import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

declare global {
  var prisma: PrismaClient | undefined;
  var prismaRuntimeModeLogged: boolean | undefined;
  var prismaDatasourceWarningLogged: boolean | undefined;
  var prismaRuntimeHostLogged: boolean | undefined;
}

function getRuntimeDatabaseUrl() {
  return (process.env.DATABASE_URL_RUNTIME || process.env.DATABASE_URL || 'file:./prisma/dev.db').trim();
}

function getDatabaseHost(databaseUrl: string) {
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    return '';
  }

  try {
    return new URL(databaseUrl).hostname || '';
  } catch {
    return '';
  }
}

function getPrismaClient() {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient should not be instantiated on the client');
  }
  
  if (global.prisma) {
    return global.prisma;
  }

  const databaseUrl = getRuntimeDatabaseUrl();
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
  const isPostgresUrl =
    databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
  const databaseHost = getDatabaseHost(databaseUrl);

  // In production runtime, require PostgreSQL. Keep build-time flexible because
  // some platforms inject DATABASE_URL only when the app starts.
  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    const strictPostgres = process.env.STRICT_POSTGRESQL === 'true';

    if (!isPostgresUrl && strictPostgres) {
      throw new Error('[prisma] STRICT_POSTGRESQL is enabled but DATABASE_URL is not PostgreSQL.');
    }

    if (!isPostgresUrl && !global.prismaDatasourceWarningLogged) {
      console.warn(
        '[prisma] Warning: production runtime is not using a PostgreSQL DATABASE_URL. ' +
          'Set STRICT_POSTGRESQL=true to enforce hard failure.'
      );
      global.prismaDatasourceWarningLogged = true;
    }
  }
  if (!isPostgresUrl && !isBuildPhase && process.env.STRICT_POSTGRESQL === 'true') {
    throw new Error('[prisma] DATABASE_URL must be a PostgreSQL URL (postgres:// or postgresql://).');
  }

  if (!isBuildPhase && isPostgresUrl && !global.prismaRuntimeHostLogged) {
    const runtimeSource = process.env.DATABASE_URL_RUNTIME ? 'DATABASE_URL_RUNTIME' : 'DATABASE_URL';
    console.info(`[prisma] Runtime DB host: ${databaseHost || 'unknown'} (source=${runtimeSource})`);
    global.prismaRuntimeHostLogged = true;
  }

  if (
    process.env.NODE_ENV === 'production' &&
    !isBuildPhase &&
    isPostgresUrl &&
    !process.env.DATABASE_URL_RUNTIME &&
    databaseHost &&
    !databaseHost.includes('.') &&
    databaseHost !== 'localhost' &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(databaseHost)
  ) {
    console.warn(
      '[prisma] DATABASE_URL host looks like an internal Docker service name and may be unreachable at runtime. ' +
        'Set DATABASE_URL_RUNTIME to a reachable PostgreSQL host for this app container/server.'
    );
  }

  const runtimeConnectionString = isPostgresUrl
    ? databaseUrl
    : 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

  // PostgreSQL: use the pg driver adapter (required by Prisma 7 client engine mode).
  const pool = new Pool({
    connectionString: runtimeConnectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  const pgAdapter = new PrismaPg(pool as any);
  const client: PrismaClient = new PrismaClient({ adapter: pgAdapter } as any);

  if (!isBuildPhase && !global.prismaRuntimeModeLogged) {
    console.info(`[prisma] Runtime datasource mode: postgresql (NODE_ENV=${process.env.NODE_ENV || 'unknown'})`);
    global.prismaRuntimeModeLogged = true;
  }

  if (process.env.NODE_ENV === 'development') {
    global.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();
