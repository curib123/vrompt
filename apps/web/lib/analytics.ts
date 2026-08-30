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
  | 'version_published';

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  metadata?: Record<string, string | number | boolean>,
  accessToken?: string | null,
) {
  void apiRequest('/analytics/events', {
    accessToken: accessToken ?? undefined,
    body: JSON.stringify({ name, metadata }),
    method: 'POST',
  }).catch(() => undefined);
}
