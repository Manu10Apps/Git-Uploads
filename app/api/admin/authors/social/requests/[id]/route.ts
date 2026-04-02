import { NextRequest, NextResponse } from 'next/server';
import { ensureAuthorSocialTables, getAdminActorFromRequest, reviewSocialChangeRequest } from '@/lib/author-social';
import { logAdminAuditEvent } from '@/lib/admin-audit-log';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureAuthorSocialTables();

    const actor = await getAdminActorFromRequest(request);
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can review requests' }, { status: 403 });
    }

    const { id } = await params;
    const requestId = Number(id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid request id' }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body?.status || '').trim().toLowerCase();
    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ success: false, error: 'status must be approved or rejected' }, { status: 400 });
    }

    const reviewed = await reviewSocialChangeRequest({
      requestId,
      status: status as 'approved' | 'rejected',
      reviewedBy: actor.email,
      unlockMinutes: Number(body?.unlockMinutes) || 15,
    });

    if (!reviewed) {
      return NextResponse.json({ success: false, error: 'Request not found or already reviewed' }, { status: 404 });
    }

    await logAdminAuditEvent({
      action: 'author_social_change_reviewed',
      actorEmail: actor.email,
      actorRole: actor.role,
      status: 'success',
      details: { requestId, decision: status },
    });

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? 'Request approved and profile unlocked' : 'Request rejected',
      data: reviewed,
    });
  } catch (error) {
    console.error('Failed to review social change request:', error);
    return NextResponse.json({ success: false, error: 'Failed to review request' }, { status: 500 });
  }
}
