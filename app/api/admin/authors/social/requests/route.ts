import { NextRequest, NextResponse } from 'next/server';
import {
  createSocialChangeRequest,
  ensureAuthorSocialTables,
  getAdminActorFromRequest,
  getAuthorSocialProfile,
  getSocialChangeRequests,
  parseSocialLinksFromPairInput,
} from '@/lib/author-social';
import { logAdminAuditEvent } from '@/lib/admin-audit-log';

export async function GET(request: NextRequest) {
  try {
    await ensureAuthorSocialTables();

    const actor = await getAdminActorFromRequest(request);
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can view requests' }, { status: 403 });
    }

    const status = (new URL(request.url).searchParams.get('status') || 'pending') as
      | 'pending'
      | 'approved'
      | 'rejected'
      | 'all';

    const rows = await getSocialChangeRequests(status);
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch social change requests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureAuthorSocialTables();

    const actor = await getAdminActorFromRequest(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    const profile = await getAuthorSocialProfile(authorName);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Author social profile not found' }, { status: 404 });
    }

    const created = await createSocialChangeRequest({
      authorId: profile.id,
      requestedBy: actor.email,
      requestedByRole: actor.role,
      requestedLinks: parsed.links,
    });

    await logAdminAuditEvent({
      action: 'author_social_change_requested',
      actorEmail: actor.email,
      actorRole: actor.role,
      status: 'success',
      details: { authorName, requestId: created?.id || null },
    });

    return NextResponse.json({
      success: true,
      message: 'Change request submitted for admin approval',
      data: created,
    });
  } catch (error) {
    console.error('Failed to create social change request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create request' }, { status: 500 });
  }
}
