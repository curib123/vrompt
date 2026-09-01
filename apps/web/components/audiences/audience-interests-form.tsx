'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { AudienceSelector } from './audience-selector';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import type { MyAudiencesResponse } from '@/lib/api';
import { trackAnalyticsEvent } from '@/lib/analytics';

export function AudienceInterestsForm({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { accessToken } = useAuth();
  const [audiences, setAudiences] = useState<MyAudiencesResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useEffectEvent(async () => {
    if (!accessToken) return;
    try {
      const result = await apiRequest<MyAudiencesResponse>('/me/audiences', {
        accessToken,
      });
      const previousIds = new Set(
        audiences?.selected
          .filter((item) => item.isActive)
          .map((item) => item.id),
      );
      const nextIds = new Set(selectedIds);
      selectedIds
        .filter((id) => !previousIds.has(id))
        .forEach(() =>
          trackAnalyticsEvent(
            'audience_interest_selected',
            undefined,
            accessToken,
          ),
        );
      [...previousIds]
        .filter((id) => !nextIds.has(id))
        .forEach(() =>
          trackAnalyticsEvent(
            'audience_interest_removed',
            undefined,
            accessToken,
          ),
        );
      setAudiences(result);
      setSelectedIds(
        result.selected.filter((item) => item.isActive).map((item) => item.id),
      );
    } catch {
      setError('Audience preferences could not be loaded.');
    }
  });

  useEffect(() => {
    // Synchronize the settings form with the authenticated preference resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [accessToken]);

  async function save() {
    if (!accessToken || selectedIds.length < 1) {
      setError('Choose at least one audience interest.');
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiRequest<MyAudiencesResponse>('/me/audiences', {
        accessToken,
        body: JSON.stringify({ audienceIds: selectedIds }),
        method: 'PUT',
      });
      setAudiences(result);
      setMessage('Audience interests updated.');
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Preferences could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className={embedded ? 'grid gap-6' : 'grid gap-8'}>
      <div className="space-y-2">
        <Badge>Preferences</Badge>
        <h2 className="text-2xl font-semibold tracking-[-0.05em]">
          Audience interests
        </h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          These preferences personalize recommendations only. You can still
          discover every public prompt.
        </p>
      </div>
      {audiences ? (
        <AudienceSelector
          disabled={isSaving}
          onChange={setSelectedIds}
          options={audiences.options}
          selectedIds={selectedIds}
        />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {error ?? 'Loading audience interests...'}
        </p>
      )}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          disabled={isSaving || selectedIds.length < 1}
          onClick={() => void save()}
        >
          {isSaving ? 'Saving...' : 'Save interests'}
        </Button>
      </div>
    </Card>
  );
}
