import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/epaper-auto-draft
 * Automatically creates a draft E-Gazeti edition every Monday.
 * Run at 03:00 UTC every Monday via Vercel cron (schedule: "0 3 * * 1").
 *
 * Security: protected by CRON_SECRET env variable.
 */
export async function GET(req: NextRequest) {
  try {
    // Validate cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader =
      req.headers.get('authorization') || req.nextUrl.searchParams.get('secret');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Work out the nearest Monday (this call is triggered ON Monday by the cron)
    const issueDate = new Date(now);
    issueDate.setUTCHours(0, 0, 0, 0);
    // Ensure we're on a Monday; if not (e.g. manual trigger) advance to next Monday
    const day = issueDate.getUTCDay(); // 0 = Sun, 1 = Mon
    if (day !== 1) {
      const daysUntilMonday = (8 - day) % 7 || 7;
      issueDate.setUTCDate(issueDate.getUTCDate() + daysUntilMonday);
    }

    // Check if a draft/edition for this Monday already exists
    const existing = await prisma.epaperEdition.findFirst({
      where: { issueDate },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Draft for this Monday already exists',
        editionId: existing.id,
        skipped: true,
      });
    }

    // Resolve the system admin who will own the draft.
    // Prefer SYSTEM_ADMIN_ID env var, fall back to the first admin role user.
    let createdBy: number | null = null;

    const systemAdminId = process.env.SYSTEM_ADMIN_ID
      ? parseInt(process.env.SYSTEM_ADMIN_ID, 10)
      : null;

    if (systemAdminId) {
      const admin = await prisma.adminUser.findUnique({ where: { id: systemAdminId } });
      if (admin) createdBy = admin.id;
    }

    if (!createdBy) {
      const firstAdmin = await prisma.adminUser.findFirst({
        where: { role: 'admin' },
        orderBy: { id: 'asc' },
      });
      createdBy = firstAdmin?.id ?? null;
    }

    if (!createdBy) {
      return NextResponse.json(
        { success: false, error: 'No admin user found to assign draft to' },
        { status: 500 }
      );
    }

    // Build a human-readable title: "E-Gazeti - Week of April 7, 2026"
    const weekLabel = issueDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const title = `E-Gazeti - Week of ${weekLabel}`;

    const draft = await prisma.epaperEdition.create({
      data: {
        title,
        issueDate,
        status: 'draft',
        isCurrent: false,
        isArchived: false,
        pageCount: 0,
        createdBy,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Draft created: "${title}"`,
      editionId: draft.id,
      issueDate: draft.issueDate,
    });
  } catch (error) {
    console.error('Error in epaper-auto-draft cron:', error);
    return NextResponse.json({ success: false, error: 'Failed to create draft' }, { status: 500 });
  }
}
