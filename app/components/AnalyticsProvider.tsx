'use client';

import { useEffect } from 'react';
import { getAnalytics } from '@/lib/analytics-tracker';

export function AnalyticsProvider() {
  useEffect(() => {
    const run = () => {
      const analytics = getAnalytics();
      analytics.trackPageview();
      analytics.trackEvent('page_loaded', {
        pathname: window.location.pathname,
        hostname: window.location.hostname,
      });
    };

    // Defer all analytics work until the browser is idle so it doesn't
    // contribute to TBT during initial page load.
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }

    const id = setTimeout(run, 2000);
    return () => clearTimeout(id);
  }, []);

  return null;
}
