'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics-tracker';

/**
 * Analytics Provider Component
 * Add this to your main layout to enable analytics tracking
 */
export function AnalyticsProvider() {
  useEffect(() => {
    // Track pageview on mount
    analytics.trackPageview();

    // Track custom event
    analytics.trackEvent('page_loaded', {
      pathname: window.location.pathname,
      hostname: window.location.hostname,
    });
  }, []);

  return null; // This component doesn't render anything
}
