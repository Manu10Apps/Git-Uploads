import { NextRequest, NextResponse } from 'next/server';
import {
  ensureAuthorSocialTables,
  getAdminActorFromRequest,
  getAuthorSocialProfile,
  parseSocialLinksFromPairInput,
  setAuthorSocialLock,
  upsertAuthorSocialProfile,
} from '@/lib/author-social';
import { logAdminAuditEvent } from '@/lib/admin-audit-log';

export async function GET(request: NextRequest) {
  try {
    await ensureAuthorSocialTables();

    const actor = await getAdminActorFromRequest(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const author = (new URL(request.url).searchParams.get('author') || '').trim();
    if (!author) {
      return NextResponse.json({ success: false, error: 'Author is required' }, { status: 400 });
    }

    const profile = await getAuthorSocialProfile(author);

    return NextResponse.json({
      success: true,
      data: profile,
      allowedPlatforms: ['x', 'facebook', 'instagram', 'linkedin'],
    });
  } catch (error) {
    console.error('Failed to fetch author social profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthorSocialTables();

    const actor = await getAdminActorFromRequest(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (actor.role !== 'admin' && actor.role !== 'sub-admin' && actor.role !== 'editor') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const authorName = String(body?.authorName || '').trim();
    if (!authorName) {
      return NextResponse.json({ success: false, error: 'authorName is required' }, { status: 400 });
    }

    const parsed = parseSocialLinksFromPairInput(body || {});
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }

    const current = await getAuthorSocialProfile(authorName);
    if (current?.socialLocked && actor.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Social profiles are locked. Request admin authorization.' },
        { status: 403 }
      );
    }

    const profile = await upsertAuthorSocialProfile({
      authorName,
      links: parsed.links,
      lockAfterSave: true,
    });

    await logAdminAuditEvent({
      action: 'author_social_set',
      actorEmail: actor.email,
      actorRole: actor.role,
      status: 'success',
      details: { authorName, links: parsed.links },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Failed to set author social profile:', error);
    return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureAuthorSocialTables();

    const actor = await getAdminActorFromRequest(request);
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can change locks' }, { status: 403 });
    }

    const body = await request.json();
    const authorName = String(body?.authorName || '').trim();
    const action = String(body?.action || '').trim().toLowerCase();

    if (!authorName) {
      return NextResponse.json({ success: false, error: 'authorName is required' }, { status: 400 });
    }

    if (!['unlock', 'relock'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action must be unlock or relock' }, { status: 400 });
    }

    const profile = await setAuthorSocialLock({
      authorName,
      locked: action === 'relock',
      unlockMinutes: action === 'unlock' ? Number(body?.unlockMinutes) || 15 : undefined,
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    await logAdminAuditEvent({
      action: action === 'unlock' ? 'author_social_unlock' : 'author_social_relock',
      actorEmail: actor.email,
      actorRole: actor.role,
      status: 'success',
      details: { authorName, unlockMinutes: Number(body?.unlockMinutes) || 15 },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Failed to update author social lock:', error);
    return NextResponse.json({ success: false, error: 'Failed to update lock' }, { status: 500 });
  }
}
