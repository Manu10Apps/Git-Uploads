import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/epaper-auto-draft
 * Every Monday at 04:00 Kigali time (02:00 UTC):
 *  - Creates a draft E-Gazeti edition for the current week
 *  - Fetches all articles published last Monday–Sunday and stores a summary in `notes`
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

    // Determine this Monday's date (issueDate for the new draft)
    const issueDate = new Date(now);
    issueDate.setUTCHours(0, 0, 0, 0);
    const day = issueDate.getUTCDay(); // 0=Sun, 1=Mon
    if (day !== 1) {
      // If triggered outside Monday (e.g. manual test), advance to next Monday
      const daysUntilMonday = (8 - day) % 7 || 7;
      issueDate.setUTCDate(issueDate.getUTCDate() + daysUntilMonday);
    }

    // Previous week: last Monday 00:00 UTC → last Sunday 23:59:59 UTC
    const prevMonday = new Date(issueDate);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    prevMonday.setUTCHours(0, 0, 0, 0);

    const prevSunday = new Date(issueDate);
    prevSunday.setUTCDate(prevSunday.getUTCDate() - 1);
    prevSunday.setUTCHours(23, 59, 59, 999);

    // Check if a draft/edition for this Monday already exists
    const existing = await prisma.epaperEdition.findFirst({ where: { issueDate } });
    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Draft for this Monday already exists',
        editionId: existing.id,
        skipped: true,
      });
    }

    // Resolve the admin who will own the draft
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

    // Fetch articles published during the previous week
    const weekArticles = await prisma.article.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: prevMonday, lte: prevSunday },
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        author: true,
        category: { select: { name: true } },
        publishedAt: true,
      },
    });

    // Determine next issue number from total editions count
    const totalEditions = await prisma.epaperEdition.count();
    const issueNumber = totalEditions + 1;

    // Build human-readable date range
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const dateRange = `${fmt(prevMonday)} – ${fmt(prevSunday)}`;

    const notes =
      weekArticles.length > 0
        ? `${weekArticles.length} article(s) published ${dateRange}:\n\n` +
          weekArticles
            .map(
              (a, i) =>
                `${i + 1}. [${a.category.name}] ${a.title}\n   By ${a.author} — /article/${a.slug}`
            )
            .join('\n\n')
        : `No articles published ${dateRange}.`;

    // Title format: "Intambwe Media Peper No 001" (zero-padded 3-digit issue number)
    const paddedNumber = String(issueNumber).padStart(3, '0');
    const title = `Intambwe Media Peper No ${paddedNumber}`;

    const draft = await prisma.epaperEdition.create({
      data: {
        title,
        issueDate,
        status: 'draft',
        notes,
        isCurrent: false,
        isArchived: false,
        pageCount: 0,
        createdBy,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Draft created: "${title}" with ${weekArticles.length} article(s)`,
      editionId: draft.id,
      issueNumber,
      issueDate: draft.issueDate,
      articleCount: weekArticles.length,
    });
  } catch (error) {
    console.error('Error in epaper-auto-draft cron:', error);
    return NextResponse.json({ success: false, error: 'Failed to create draft' }, { status: 500 });
  }
}
