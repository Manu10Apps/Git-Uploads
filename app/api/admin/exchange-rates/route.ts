import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/exchange-rates
 * Fetch all current exchange rates
 */
export async function GET() {
  try {
    const rates = await (prisma as any).exchangeRate.findMany({
      orderBy: { currency: 'asc' },
    });

    if (rates.length === 0) {
      // Return default rates if none exist
      return NextResponse.json({
        success: true,
        data: [
          { currency: 'USD', rate: 1287, change: 0 },
          { currency: 'EUR', rate: 1395, change: 0 },
          { currency: 'GBP', rate: 1621, change: 0 },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      data: rates.map((r: any) => ({
        currency: r.currency,
        rate: r.rate,
        change: r.change,
      })),
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exchange rates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/exchange-rates
 * Update exchange rates (called by daily cron job or manual update)
 * Expected body:
 * {
 *   "rates": [
 *     { "currency": "USD", "rate": 1461.99 },
 *     { "currency": "EUR", "rate": 1694.92 },
 *     { "currency": "GBP", "rate": 1953.13 }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check for admin authentication (you can add more security here)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== process.env.EXCHANGE_RATE_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rates } = body;

    if (!Array.isArray(rates)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Update exchange rates
    const updatedRates = [];
    for (const rateData of rates) {
      const { currency, rate } = rateData;

      if (!currency || rate === undefined) {
        continue;
      }

      // Get previous rate to calculate change
      const previousRate = await (prisma as any).exchangeRate.findUnique({
        where: { currency },
      });

      let change = 0;
      if (previousRate) {
        change = ((rate - previousRate.rate) / previousRate.rate) * 100;
        change = Math.round(change * 100) / 100; // Round to 2 decimals
      }

      const updated = await (prisma as any).exchangeRate.upsert({
        where: { currency },
        update: {
          rate,
          change,
        },
        create: {
          currency,
          rate,
          change,
        },
      });

      updatedRates.push({
        currency: updated.currency,
        rate: updated.rate,
        change: updated.change,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Exchange rates updated successfully',
      data: updatedRates,
    });
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update exchange rates' },
      { status: 500 }
    );
  }
}
