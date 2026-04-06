import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEpaperPDF, EpaperArticle } from '@/lib/epaper-pdf-generator';
import path from 'path';

/**
 * GET /api/cron/epaper-auto-draft
 * Every Monday at 18:00 GMT:
 *  - Creates a draft E-Gazeti edition and auto-generates the designed PDF
 *  - Issue #1: fetches ALL published articles (first-ever edition)
 *  - Issue #2+: fetches articles from the previous Monday–Sunday only
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

    // Determine next issue number from total editions count
    const totalEditions = await prisma.epaperEdition.count();
    const issueNumber = totalEditions + 1;
    const isFirstEdition = issueNumber === 1;

    // Issue #1 → all published articles ever; Issue #2+ → previous Mon–Sun only
    const articleWhere = isFirstEdition
      ? { status: 'published' as const }
      : { status: 'published' as const, publishedAt: { gte: prevMonday, lte: prevSunday } };

    const weekArticles = await prisma.article.findMany({
      where: articleWhere,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        author: true,
        featured: true,
        category: { select: { name: true } },
        publishedAt: true,
      },
    });

    // Build human-readable date range label
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    const dateRange = isFirstEdition
      ? 'all published articles'
      : `${fmt(prevMonday)} – ${fmt(prevSunday)}`;

    const notes =
      weekArticles.length > 0
        ? `${weekArticles.length} article(s) — ${dateRange}:\n\n` +
          weekArticles
            .map(
              (a, i) =>
                `${i + 1}. [${a.category.name}] ${a.title}\n   By ${a.author} — /article/${a.slug}`
            )
            .join('\n\n')
        : `No articles found (${dateRange}).`;

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

    // ── Auto-generate the designed newspaper PDF ───────────────────────────
    let pdfUrl: string | null = null;
    let pdfPageCount = 0;
    let pdfFileSize = 0;

    if (weekArticles.length > 0) {
      try {
        const articles: EpaperArticle[] = weekArticles.map(a => ({
          id:          a.id,
          title:       a.title,
          excerpt:     a.excerpt ?? '',
          author:      a.author,
          category:    a.category.name,
          publishedAt: a.publishedAt,
        }));

        const outDir = path.join(process.cwd(), 'public', 'uploads', 'epaper');
        const result = await generateEpaperPDF({
          issueTitle: title,
          issueDate,
          articles,
          outDir,
        });

        pdfUrl       = result.publicUrl;
        pdfPageCount = result.pageCount;
        pdfFileSize  = result.fileSize;

        // Update the draft with the generated PDF details
        await prisma.epaperEdition.update({
          where: { id: draft.id },
          data: {
            pdfUrl,
            pageCount: pdfPageCount,
            fileSize:  pdfFileSize,
          },
        });
      } catch (pdfErr) {
        console.error('PDF generation failed (draft still created):', pdfErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Draft created: "${title}" with ${weekArticles.length} article(s)${pdfUrl ? ' + PDF generated' : ''}`,
      editionId: draft.id,
      issueNumber,
      issueDate: draft.issueDate,
      articleCount: weekArticles.length,
      pdfUrl: pdfUrl ?? undefined,
    });
  } catch (error) {
    console.error('Error in epaper-auto-draft cron:', error);
    return NextResponse.json({ success: false, error: 'Failed to create draft' }, { status: 500 });
  }
}
