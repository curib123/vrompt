import { IsIn, IsObject, IsOptional } from 'class-validator';

export const ANALYTICS_EVENT_NAMES = [
  'auth_completed',
  'collection_created',
  'comment_created',
  'evidence_viewed',
  'follow_created',
  'prompt_copied',
  'prompt_saved',
  'repository_liked',
  'repository_published',
  'repository_viewed',
  'search_performed',
  'variant_created',
  'version_published',
  'audience_interest_selected',
  'audience_interest_removed',
  'audience_filter_used',
  'recommended_prompt_opened',
  'landing_viewed',
  'signup_started',
  'onboarding_completed',
  'returning_user',
  'prompt_share_clicked',
  'prompt_link_copied',
  'prompt_share_native',
  'prompt_share_x',
  'prompt_share_facebook',
  'prompt_share_linkedin',
  'prompt_share_reddit',
  'shared_prompt_opened',
  'prompt_generated',
  'prompt_reused',
  'prompt_favorited',
  'prompt_unfavorited',
  'prompt_pinned',
  'prompt_unpinned',
  'prompt_adapted',
  'prompt_updated',
  'prompt_history_restored',
  'project_created',
  'prompt_added_to_project',
  'prompt_removed_from_project',
  'public_prompt_viewed',
  'public_prompt_used',
  'signup_started_from_prompt',
  'signup_completed_from_prompt',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export class TrackAnalyticsEventDto {
  @IsIn(ANALYTICS_EVENT_NAMES)
  name!: AnalyticsEventName;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
