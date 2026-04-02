import { NextRequest, NextResponse } from 'next/server';
import { autoArchiveOldEditions } from '@/lib/epaper';

/**
 * GET /api/cron/epaper-auto-archive
 * Auto-archives E-Paper editions older than 4 weeks
 * 
 * Security: This endpoint should be called by a trusted cron service
 * Add CRON_SECRET to environment variables and validate it
 */
export async function GET(req: NextRequest) {
  try {
    // Validate cron secret (add to .env.local)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization') || req.nextUrl.searchParams.get('secret');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run auto-archive
    const count = await autoArchiveOldEditions();

    return NextResponse.json({
      success: true,
      message: `Auto-archived ${count} old E-Paper editions`,
      archivedCount: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in epaper auto-archive cron:', error);
    return NextResponse.json(
      { success: false, error: 'Auto-archive failed' },
      { status: 500 }
    );
  }
}
