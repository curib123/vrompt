import { apiRequest } from './api';

export type AnalyticsEventName =
  | 'auth_completed'
  | 'collection_created'
  | 'comment_created'
  | 'evidence_viewed'
  | 'follow_created'
  | 'prompt_copied'
  | 'prompt_saved'
  | 'repository_liked'
  | 'repository_published'
  | 'repository_viewed'
  | 'search_performed'
  | 'variant_created'
  | 'version_published'
  | 'audience_interest_selected'
  | 'audience_interest_removed'
  | 'audience_filter_used'
  | 'recommended_prompt_opened'
  | 'landing_viewed'
  | 'signup_started'
  | 'onboarding_completed'
  | 'returning_user'
  | 'prompt_share_clicked'
  | 'prompt_link_copied'
  | 'prompt_share_native'
  | 'prompt_share_x'
  | 'prompt_share_facebook'
  | 'prompt_share_linkedin'
  | 'prompt_share_reddit'
  | 'shared_prompt_opened'
  | 'prompt_generated'
  | 'prompt_reused'
  | 'prompt_favorited'
  | 'prompt_unfavorited'
  | 'prompt_pinned'
  | 'prompt_unpinned'
  | 'prompt_adapted'
  | 'prompt_updated'
  | 'prompt_history_restored'
  | 'project_created'
  | 'prompt_added_to_project';

const journeyStorageKey = 'vrompt-analytics-journey';

function getJourneyId() {
  if (typeof window === 'undefined') return undefined;

  const existing = window.sessionStorage.getItem(journeyStorageKey);
  if (existing) return existing;

  const journeyId =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(journeyStorageKey, journeyId);
  return journeyId;
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  metadata?: Record<string, string | number | boolean>,
  accessToken?: string | null,
) {
  const journeyId = getJourneyId();
  void apiRequest('/analytics/events', {
    accessToken: accessToken ?? undefined,
    body: JSON.stringify({
      name,
      metadata: journeyId ? { ...metadata, journeyId } : metadata,
    }),
    method: 'POST',
  }).catch(() => undefined);
}
