'use client';

import { useEffect } from 'react';

import { trackAnalyticsEvent } from '@/lib/analytics';

export function SharedPromptTracker({ promptId }: { promptId: string }) {
  useEffect(() => {
    const key = `vrompt-shared-prompt:${promptId}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    trackAnalyticsEvent('shared_prompt_opened', { promptId });
  }, [promptId]);

  return null;
}
