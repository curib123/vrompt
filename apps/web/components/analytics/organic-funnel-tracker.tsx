'use client';

import { useEffect } from 'react';

import { trackAnalyticsEvent } from '@/lib/analytics';

const landingViewedKey = 'vrompt-landing-viewed';

export function OrganicFunnelTracker() {
  useEffect(() => {
    if (window.sessionStorage.getItem(landingViewedKey)) return;

    window.sessionStorage.setItem(landingViewedKey, '1');
    const referrer = document.referrer;
    const source = /google\.|bing\.|duckduckgo\.|yahoo\./i.test(referrer)
      ? 'organic'
      : referrer
        ? 'referral'
        : 'direct';
    trackAnalyticsEvent('landing_viewed', { source });
  }, []);

  return null;
}
