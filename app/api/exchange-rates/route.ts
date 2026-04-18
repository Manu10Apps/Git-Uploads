import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/exchange-rates
 * Returns currency exchange rates
 * Query params: from=USD&to=RWF
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from') || 'USD';
    const to = searchParams.get('to') || 'RWF';

    // Cache exchange rates for 6 hours
    const cacheKey = `exchange_rate_${from}_${to}`;
    
    // Try to get from cache (in production, use Redis or similar)
    // For now, use a simple in-memory cache or fetch fresh
    let rate: number;

    // Use Open Exchange Rates API or similar
    // For development, use fixed rates or mock data
    if (from === 'USD' && to === 'RWF') {
      // Fetch from cache or API
      rate = await fetchExchangeRate(from, to);
    } else if (from === 'RWF' && to === 'USD') {
      // Inverse rate
      const baseRate = await fetchExchangeRate('USD', 'RWF');
      rate = 1 / baseRate;
    } else {
      // For other currency pairs, use a default or fetch
      rate = 1;
    }

    return NextResponse.json({
      from,
      to,
      rate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    
    // Return default rates on error
    const from = new URL(request.url).searchParams.get('from') || 'USD';
    const to = new URL(request.url).searchParams.get('to') || 'RWF';
    
    let defaultRate = 1;
    if (from === 'USD' && to === 'RWF') {
      defaultRate = 1300; // Default USD to RWF rate
    } else if (from === 'RWF' && to === 'USD') {
      defaultRate = 1 / 1300;
    }

    return NextResponse.json({
      from,
      to,
      rate: defaultRate,
      source: 'default',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Fetch current exchange rate from external API or cache
 */
async function fetchExchangeRate(from: string, to: string): Promise<number> {
  // Try Open Exchange Rates API (if configured)
  const apiKey = process.env.OPEN_EXCHANGE_RATES_API_KEY;
  
  if (apiKey && from === 'USD') {
    try {
      const response = await fetch(
        `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${from}&symbols=${to}`,
        { next: { revalidate: 21600 } } // Cache for 6 hours
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.rates?.[to] || 1300;
      }
    } catch (err) {
      console.warn('Failed to fetch from Open Exchange Rates:', err);
    }
  }

  // Try Google's exchange rate API (no auth needed, but may have CORS issues)
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`,
      { next: { revalidate: 21600 } } // Cache for 6 hours
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.rates?.[to] || 1300;
    }
  } catch (err) {
    console.warn('Failed to fetch from exchangerate-api:', err);
  }

  // Try alternative API
  try {
    const response = await fetch(
      `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`,
      { next: { revalidate: 21600 } } // Cache for 6 hours
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.rates?.[to] || 1300;
    }
  } catch (err) {
    console.warn('Failed to fetch from exchangerate.host:', err);
  }

  // Return default rate if all APIs fail
  return 1300; // Default USD to RWF rate
}
