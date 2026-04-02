import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const ALLOWED_SOCIAL_PLATFORMS = ['x', 'facebook', 'instagram', 'linkedin'] as const;
export type AllowedSocialPlatform = (typeof ALLOWED_SOCIAL_PLATFORMS)[number];

const SOCIAL_PLATFORM_SET = new Set<string>(ALLOWED_SOCIAL_PLATFORMS);

export type SocialLinks = Partial<Record<AllowedSocialPlatform, string>>;

export type AdminActor = {
  email: string;
  role: 'admin' | 'sub-admin' | 'editor';
  name: string;
};

export type AuthorSocialProfile = {
  id: number;
  authorName: string;
  socialLinks: SocialLinks;
  socialLocked: boolean;
  unlockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function ensureAuthorSocialTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS author_social_profiles (
      id SERIAL PRIMARY KEY,
      author_name TEXT NOT NULL UNIQUE,
      social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
      social_locked BOOLEAN NOT NULL DEFAULT TRUE,
      unlocked_until TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS social_change_requests (
      id SERIAL PRIMARY KEY,
      author_id INTEGER NOT NULL REFERENCES author_social_profiles(id) ON DELETE CASCADE,
      requested_by TEXT NOT NULL,
      requested_by_role TEXT NOT NULL,
      requested_links JSONB,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS social_change_requests_author_id_idx ON social_change_requests(author_id);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS social_change_requests_status_idx ON social_change_requests(status);`
  );
}

function normalizePlatform(value: unknown): AllowedSocialPlatform | null {
  const platform = String(value || '').trim().toLowerCase();
  if (!platform) {
    return null;
  }
  return SOCIAL_PLATFORM_SET.has(platform) ? (platform as AllowedSocialPlatform) : null;
}

function normalizeUrl(value: unknown): string | null {
  const url = String(value || '').trim();
  if (!url) {
    return null;
  }
  return url;
}

export function parseSocialLinksFromPairInput(input: {
  authorSocialPlatform?: unknown;
  authorSocialUrl?: unknown;
  authorSocialPlatform2?: unknown;
  authorSocialUrl2?: unknown;
}): { ok: true; links: SocialLinks } | { ok: false; error: string } {
  const p1 = normalizePlatform(input.authorSocialPlatform);
  const p2 = normalizePlatform(input.authorSocialPlatform2);
  const u1 = normalizeUrl(input.authorSocialUrl);
  const u2 = normalizeUrl(input.authorSocialUrl2);

  if (input.authorSocialPlatform && !p1) {
    return { ok: false, error: 'Unsupported social platform in slot 1' };
  }
  if (input.authorSocialPlatform2 && !p2) {
    return { ok: false, error: 'Unsupported social platform in slot 2' };
  }

  if (u1 && !/^https?:\/\//i.test(u1)) {
    return { ok: false, error: 'Author social URL must start with http:// or https://' };
  }
  if (u2 && !/^https?:\/\//i.test(u2)) {
    return { ok: false, error: 'Second author social URL must start with http:// or https://' };
  }

  if ((p1 && !u1) || (!p1 && u1)) {
    return { ok: false, error: 'Platform and URL 1 must both be provided together' };
  }
  if ((p2 && !u2) || (!p2 && u2)) {
    return { ok: false, error: 'Platform and URL 2 must both be provided together' };
  }
  if (p1 && p2 && p1 === p2) {
    return { ok: false, error: 'Duplicate social platforms are not allowed' };
  }

  const links: SocialLinks = {};
  if (p1 && u1) {
    links[p1] = u1;
  }
  if (p2 && u2) {
    links[p2] = u2;
  }

  return { ok: true, links };
}

export function linksToPairFields(links: SocialLinks): {
  authorSocialPlatform: string | null;
  authorSocialUrl: string | null;
  authorSocialPlatform2: string | null;
  authorSocialUrl2: string | null;
} {
  const entries = Object.entries(links).filter(([, url]) => Boolean(url));
  const first = entries[0] || null;
  const second = entries[1] || null;

  return {
    authorSocialPlatform: first ? first[0] : null,
    authorSocialUrl: first ? first[1] || null : null,
    authorSocialPlatform2: second ? second[0] : null,
    authorSocialUrl2: second ? second[1] || null : null,
  };
}

export async function getAdminActorFromRequest(request: NextRequest): Promise<AdminActor | null> {
  const email = request.headers.get('x-admin-email')?.trim().toLowerCase();
  if (!email) {
    return null;
  }

  const envAdminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (envAdminEmail && envAdminEmail === email) {
    return {
      email,
      role: 'admin',
      name: process.env.ADMIN_NAME || 'Admin',
    };
  }

  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: { role: true, name: true },
  });

  if (!user || !['admin', 'sub-admin', 'editor'].includes(user.role)) {
    return null;
  }

  return {
    email,
    role: user.role as 'admin' | 'sub-admin' | 'editor',
    name: user.name,
  };
}

export async function getAuthorSocialProfile(authorName: string): Promise<AuthorSocialProfile | null> {
  const normalized = authorName.trim();
  if (!normalized) {
    return null;
  }

  const rows = await prisma.$queryRaw<Array<{
    id: number;
    author_name: string;
    social_links: unknown;
    social_locked: boolean;
    unlocked_until: Date | null;
    created_at: Date;
    updated_at: Date;
  }>>`
    SELECT id, author_name, social_links, social_locked, unlocked_until, created_at, updated_at
    FROM author_social_profiles
    WHERE author_name = ${normalized}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    authorName: row.author_name,
    socialLinks: (row.social_links || {}) as SocialLinks,
    socialLocked: Boolean(row.social_locked),
    unlockedUntil: row.unlocked_until ? row.unlocked_until.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function upsertAuthorSocialProfile(input: {
  authorName: string;
  links: SocialLinks;
  lockAfterSave: boolean;
}) {
  const authorName = input.authorName.trim();

  const rows = await prisma.$queryRaw<Array<{
    id: number;
    author_name: string;
    social_links: unknown;
    social_locked: boolean;
    unlocked_until: Date | null;
    created_at: Date;
    updated_at: Date;
  }>>`
    INSERT INTO author_social_profiles (author_name, social_links, social_locked, unlocked_until, updated_at)
    VALUES (${authorName}, ${JSON.stringify(input.links)}::jsonb, ${input.lockAfterSave}, ${null}, CURRENT_TIMESTAMP)
    ON CONFLICT (author_name)
    DO UPDATE SET
      social_links = EXCLUDED.social_links,
      social_locked = EXCLUDED.social_locked,
      unlocked_until = NULL,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, author_name, social_links, social_locked, unlocked_until, created_at, updated_at
  `;

  const row = rows[0];
  return {
    id: row.id,
    authorName: row.author_name,
    socialLinks: (row.social_links || {}) as SocialLinks,
    socialLocked: Boolean(row.social_locked),
    unlockedUntil: row.unlocked_until ? row.unlocked_until.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function setAuthorSocialLock(input: {
  authorName: string;
  locked: boolean;
  unlockMinutes?: number;
}) {
  const authorName = input.authorName.trim();
  const unlockUntil = !input.locked && input.unlockMinutes
    ? new Date(Date.now() + input.unlockMinutes * 60 * 1000)
    : null;

  const rows = await prisma.$queryRaw<Array<{
    id: number;
    author_name: string;
    social_links: unknown;
    social_locked: boolean;
    unlocked_until: Date | null;
    created_at: Date;
    updated_at: Date;
  }>>`
    UPDATE author_social_profiles
    SET social_locked = ${input.locked},
        unlocked_until = ${unlockUntil},
        updated_at = CURRENT_TIMESTAMP
    WHERE author_name = ${authorName}
    RETURNING id, author_name, social_links, social_locked, unlocked_until, created_at, updated_at
  `;

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    authorName: row.author_name,
    socialLinks: (row.social_links || {}) as SocialLinks,
    socialLocked: Boolean(row.social_locked),
    unlockedUntil: row.unlocked_until ? row.unlocked_until.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createSocialChangeRequest(input: {
  authorId: number;
  requestedBy: string;
  requestedByRole: string;
  requestedLinks: SocialLinks;
}) {
  const rows = await prisma.$queryRaw<Array<{
    id: number;
    author_id: number;
    requested_by: string;
    requested_by_role: string;
    requested_links: unknown;
    status: string;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    created_at: Date;
  }>>`
    INSERT INTO social_change_requests (author_id, requested_by, requested_by_role, requested_links, status)
    VALUES (${input.authorId}, ${input.requestedBy}, ${input.requestedByRole}, ${JSON.stringify(input.requestedLinks)}::jsonb, 'pending')
    RETURNING id, author_id, requested_by, requested_by_role, requested_links, status, reviewed_by, reviewed_at, created_at
  `;

  return rows[0] || null;
}

export async function getSocialChangeRequests(status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') {
  const whereSql = status === 'all' ? '' : `WHERE r.status = '${status}'`;

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: number;
    author_id: number;
    author_name: string;
    requested_by: string;
    requested_by_role: string;
    requested_links: unknown;
    status: string;
    reviewed_by: string | null;
    reviewed_at: Date | null;
    created_at: Date;
  }>>(
    `
      SELECT r.id, r.author_id, p.author_name, r.requested_by, r.requested_by_role, r.requested_links, r.status, r.reviewed_by, r.reviewed_at, r.created_at
      FROM social_change_requests r
      JOIN author_social_profiles p ON p.id = r.author_id
      ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT 200
    `
  );

  return rows;
}

export async function reviewSocialChangeRequest(input: {
  requestId: number;
  status: 'approved' | 'rejected';
  reviewedBy: string;
  unlockMinutes?: number;
}) {
  const rows = await prisma.$queryRaw<Array<{
    id: number;
    author_id: number;
    requested_links: unknown;
    status: string;
  }>>`
    UPDATE social_change_requests
    SET status = ${input.status},
        reviewed_by = ${input.reviewedBy},
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ${input.requestId}
      AND status = 'pending'
    RETURNING id, author_id, requested_links, status
  `;

  const requestRow = rows[0];
  if (!requestRow) {
    return null;
  }

  if (input.status === 'approved') {
    const unlockUntil = input.unlockMinutes
      ? new Date(Date.now() + input.unlockMinutes * 60 * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$queryRaw`
      UPDATE author_social_profiles
      SET social_locked = false,
          unlocked_until = ${unlockUntil},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestRow.author_id}
    `;
  }

  return requestRow;
}

export function isProfileLockedForActor(profile: AuthorSocialProfile, actorRole: 'admin' | 'sub-admin' | 'editor') {
  if (actorRole === 'admin') {
    return false;
  }

  if (!profile.socialLocked) {
    if (!profile.unlockedUntil) {
      return false;
    }
    return new Date(profile.unlockedUntil).getTime() <= Date.now();
  }

  return true;
}
