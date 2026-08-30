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
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export class TrackAnalyticsEventDto {
  @IsIn(ANALYTICS_EVENT_NAMES)
  name!: AnalyticsEventName;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
