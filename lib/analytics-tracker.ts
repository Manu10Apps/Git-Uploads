/**
 * Analytics Tracking Utility
 * Sends pageview and event data to /api/analytics/send
 */

interface AnalyticsConfig {
  endpoint?: string;
  debug?: boolean;
}

class Analytics {
  private sessionId: string;
  private visitorId: string;
  private endpoint: string;
  private debug: boolean;
  private pageStartTime: number = Date.now();

  constructor(config: AnalyticsConfig = {}) {
    this.endpoint = config.endpoint || '/api/analytics/send';
    this.debug = config.debug || false;
    
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
    
    // Generate visitor ID from localStorage or create new
    this.visitorId = this.getOrCreateVisitorId();

    if (this.debug) {
      console.log('[Analytics] Initialized', {
        sessionId: this.sessionId,
        visitorId: this.visitorId,
      });
    }
  }

  /**
   * Track pageview - call on page load
   */
  public trackPageview() {
    const data = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      eventType: 'pageview',
      pageUrl: window.location.pathname,
      pageTitle: document.title,
      referrer: document.referrer,
    };

    this.send(data);

    if (this.debug) {
      console.log('[Analytics] Pageview tracked:', data);
    }

    // Track scroll depth
    this.trackScrollDepth();

    // Track time on page
    this.trackTimeOnPage();
  }

  /**
   * Track custom events
   */
  public trackEvent(eventName: string, properties?: Record<string, any>) {
    const data = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      eventType: 'custom',
      eventName,
      pageUrl: window.location.pathname,
      pageTitle: document.title,
      properties,
    };

    this.send(data);

    if (this.debug) {
      console.log('[Analytics] Event tracked:', eventName, properties);
    }
  }

  /**
   * Track scroll depth on the page
   */
  private trackScrollDepth() {
    let maxScroll = 0;
    let reported = false;

    window.addEventListener('scroll', () => {
      const scrollPercentage =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      maxScroll = Math.max(maxScroll, scrollPercentage);
    });

    // Report scroll depth when user leaves or after 30 seconds
    const reportScroll = () => {
      if (!reported && maxScroll > 0) {
        this.send({
          sessionId: this.sessionId,
          visitorId: this.visitorId,
          eventType: 'pageview',
          pageUrl: window.location.pathname,
          pageTitle: document.title,
          scrollDepth: Math.round(maxScroll),
        });
        reported = true;

        if (this.debug) {
          console.log('[Analytics] Scroll depth tracked:', Math.round(maxScroll));
        }
      }
    };

    setTimeout(reportScroll, 30000); // Report after 30s
    window.addEventListener('beforeunload', reportScroll); // Report on page leave
  }

  /**
   * Track time spent on page
   */
  private trackTimeOnPage() {
    window.addEventListener('beforeunload', () => {
      const duration = Math.round((Date.now() - this.pageStartTime) / 1000);

      this.send({
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        eventType: 'pageview',
        pageUrl: window.location.pathname,
        pageTitle: document.title,
        duration,
      });

      if (this.debug) {
        console.log('[Analytics] Time on page tracked:', duration, 's');
      }
    });
  }

  /**
   * Send data to analytics endpoint
   */
  private send(data: Record<string, any>) {
    if (!navigator.sendBeacon) {
      // Fallback to fetch
      fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(error => {
        if (this.debug) {
          console.error('[Analytics] Send failed:', error);
        }
      });
    } else {
      // Use sendBeacon for better reliability
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(this.endpoint, blob);
    }
  }

  /**
   * Get or create session ID (expires after 30 minutes of inactivity)
   */
  private getOrCreateSessionId(): string {
    const key = 'analytics_session_id';
    const timeKey = 'analytics_session_time';
    
    const stored = localStorage.getItem(key);
    const storedTime = localStorage.getItem(timeKey);
    const now = Date.now();

    // Check if session is still valid (30 minutes)
    if (stored && storedTime && now - parseInt(storedTime) < 30 * 60 * 1000) {
      // Update session time
      localStorage.setItem(timeKey, now.toString());
      return stored;
    }

    // Create new session
    const sessionId = this.generateId();
    localStorage.setItem(key, sessionId);
    localStorage.setItem(timeKey, now.toString());

    return sessionId;
  }

  /**
   * Get or create visitor ID (persists indefinitely)
   */
  private getOrCreateVisitorId(): string {
    const key = 'analytics_visitor_id';
    let visitorId = localStorage.getItem(key);

    if (!visitorId) {
      visitorId = this.generateId();
      localStorage.setItem(key, visitorId);
    }

    return visitorId;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const analytics = new Analytics({
  debug: process.env.NODE_ENV === 'development',
});

export default Analytics;
