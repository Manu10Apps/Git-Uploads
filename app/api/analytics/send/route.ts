import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Use dynamic import for ua-parser-js (works with both ESM and CommonJS)
const UAParserModule = require('ua-parser-js');

// IP to Geolocation (free service - optional)
const getGeolocation = async (ip: string) => {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json();
    return {
      country: data.country_name,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  } catch (error) {
    return { country: null, city: null, latitude: null, longitude: null };
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      sessionId,
      visitorId,
      eventType = 'pageview',
      eventName,
      pageUrl,
      pageTitle,
      referrer,
      duration,
      scrollDepth,
      properties,
    } = body;

    // Validate required fields
    if (!sessionId || !pageUrl || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, pageUrl, eventType' },
        { status: 400 }
      );
    }

    // Parse User Agent
    const userAgent = request.headers.get('user-agent') || body.userAgent;
    const UAParser = UAParserModule.UAParser || UAParserModule;
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    // Get client IP
    const ip = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '0.0.0.0';

    // Get geolocation (optional, can be slow)
    const geo = await getGeolocation(ip);

    // Store event in database
    const event = await prisma.analyticsEvent.create({
      data: {
        sessionId,
        visitorId: visitorId || ip, // Use IP as fallback visitorId
        eventType,
        eventName,
        pageUrl,
        pageTitle,
        referrer,
        userAgent,
        deviceType: uaResult.device?.type || 'desktop', // mobile, tablet, desktop
        browserName: uaResult.browser?.name,
        browserVersion: uaResult.browser?.version,
        osName: uaResult.os?.name,
        country: geo.country,
        city: geo.city,
        latitude: geo.latitude,
        longitude: geo.longitude,
        duration: duration ? parseInt(duration) : null,
        scrollDepth: scrollDepth ? parseInt(scrollDepth) : null,
        properties: properties ? JSON.stringify(properties) : null,
      },
    });

    return NextResponse.json(
      { success: true, eventId: event.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Analytics send error:', error);
    return NextResponse.json(
      { error: 'Failed to record event' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
