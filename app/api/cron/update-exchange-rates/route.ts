import { NextRequest, NextResponse } from 'next/server';
import { updateExchangeRatesFromExternalAPI } from '@/lib/exchange-rates';

/**
 * POST /api/cron/update-exchange-rates
 * 
 * Scheduled endpoint to update exchange rates daily
 * 
 * This endpoint should be called by an external cron service like:
 * - cron-job.org
 * - Vercel Cron (if deployed on Vercel)
 * - Railway/Dokploy scheduler
 * 
 * Call this endpoint daily with your CRON_SECRET in the Authorization header:
 * curl -X POST https://yourdomain.com/api/cron/update-exchange-rates \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the cron secret for security
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update exchange rates from external API
    const result = await updateExchangeRatesFromExternalAPI();

    return NextResponse.json({
      success: true,
      message: 'Exchange rates updated successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update exchange rates',
      },
      { status: 500 }
    );
  }
}
