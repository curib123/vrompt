'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';

import { AudienceSelector } from './audience-selector';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import type { MyAudiencesResponse } from '@/lib/api';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { consumeOAuthReturnPath } from '@/lib/auth-return';

export function AudienceOnboarding() {
  const router = useRouter();
  const { accessToken, refreshSession } = useAuth();
  const [data, setData] = useState<MyAudiencesResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useEffectEvent(async () => {
    if (!accessToken) return;
    try {
      const result = await apiRequest<MyAudiencesResponse>('/me/audiences', {
        accessToken,
      });
      if (result.onboardingCompleted) {
        router.replace((consumeOAuthReturnPath() || '/search') as Route);
        return;
      }
      setData(result);
      setSelectedIds(
        result.selected.filter((item) => item.isActive).map((item) => item.id),
      );
    } catch {
      setError('We could not load your audience choices. Please try again.');
    }
  });

  useEffect(() => {
    // Load the resumable onboarding state for this Google account.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [accessToken]);

  async function continueOnboarding() {
    if (!accessToken) {
      setError('Your session is no longer available. Please sign in again.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await apiRequest('/me/audiences', {
        accessToken,
        body: JSON.stringify({ audienceIds: selectedIds }),
        method: 'PUT',
      });
      trackAnalyticsEvent(
        'onboarding_completed',
        { source: 'audience_preferences' },
        accessToken,
      );
      selectedIds.forEach(() =>
        trackAnalyticsEvent(
          'audience_interest_selected',
          undefined,
          accessToken,
        ),
      );
      await refreshSession();
      router.replace((consumeOAuthReturnPath() || '/search') as Route);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Your choices could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mx-auto grid max-w-3xl gap-8 p-5 sm:p-10">
      <div className="space-y-4">
        <Badge>One quick step</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          Choose what you&apos;re interested in
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Select the types of prompts you want to discover. You can change this
          later.
        </p>
      </div>
      {data ? (
        <AudienceSelector
          disabled={isSaving}
          onChange={setSelectedIds}
          options={data.options}
          selectedIds={selectedIds}
        />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {error ?? 'Loading audience options...'}
        </p>
      )}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            disabled={isSaving}
            onClick={() => setSelectedIds([])}
            variant="ghost"
          >
            Clear choices
          </Button>
          <Button disabled={isSaving} onClick={() => void continueOnboarding()}>
            {isSaving
              ? 'Saving...'
              : selectedIds.length > 0
                ? 'Continue'
                : 'Skip for now'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
