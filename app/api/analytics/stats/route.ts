import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total pageviews
    const totalPageviews = await prisma.analyticsEvent.count({
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
      },
    });

    // Unique visitors
    const uniqueVisitors = await prisma.analyticsEvent.findMany({
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
      },
      distinct: ['visitorId'],
      select: { visitorId: true },
    });

    // Unique sessions
    const uniqueSessions = await prisma.analyticsEvent.findMany({
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
      },
      distinct: ['sessionId'],
      select: { sessionId: true },
    });

    // Top pages
    const topPages = await prisma.analyticsEvent.groupBy({
      by: ['pageUrl', 'pageTitle'],
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Traffic by country
    const trafficByCountry = await prisma.analyticsEvent.groupBy({
      by: ['country'],
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
        country: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });

    // Traffic by device
    const trafficByDevice = await prisma.analyticsEvent.groupBy({
      by: ['deviceType'],
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Traffic by browser
    const trafficByBrowser = await prisma.analyticsEvent.groupBy({
      by: ['browserName'],
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
        browserName: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Hourly traffic (last 24h)
    const last24h = new Date();
    last24h.setDate(last24h.getDate() - 1);

    const hourlyTraffic = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count
      FROM analytics_events
      WHERE event_type = 'pageview'
        AND created_at >= $1
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour ASC
    `;

    // Average session duration
    const avgDuration = await prisma.analyticsEvent.aggregate({
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
        duration: { not: null },
      },
      _avg: { duration: true },
    });

    // Average scroll depth
    const avgScroll = await prisma.analyticsEvent.aggregate({
      where: {
        eventType: 'pageview',
        createdAt: { gte: startDate },
        scrollDepth: { not: null },
      },
      _avg: { scrollDepth: true },
    });

    return NextResponse.json({
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      summary: {
        totalPageviews,
        uniqueVisitors: uniqueVisitors.length,
        uniqueSessions: uniqueSessions.length,
        avgSessionDuration: Math.round(avgDuration._avg.duration || 0),
        avgScrollDepth: Math.round(avgScroll._avg.scrollDepth || 0),
      },
      topPages: topPages.map(page => ({
        url: page.pageUrl,
        title: page.pageTitle,
        views: page._count.id,
      })),
      trafficByCountry: trafficByCountry.map(country => ({
        country: country.country || 'Unknown',
        views: country._count.id,
      })),
      trafficByDevice: trafficByDevice.map(device => ({
        device: device.deviceType || 'Unknown',
        views: device._count.id,
      })),
      trafficByBrowser: trafficByBrowser.map(browser => ({
        browser: browser.browserName || 'Unknown',
        views: browser._count.id,
      })),
      hourlyTraffic: hourlyTraffic,
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve stats' },
      { status: 500 }
    );
  }
}
