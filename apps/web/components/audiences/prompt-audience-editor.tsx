'use client';

import { useEffect, useState } from 'react';

import { AudienceSelector } from './audience-selector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import type { AudienceOption, PromptRepositoryDetail } from '@/lib/api';

export function PromptAudienceEditor({
  accessToken,
  initialAudienceIds,
  onSaved,
  repositorySlug,
}: {
  accessToken: string | null;
  initialAudienceIds: string[];
  onSaved: (repository: PromptRepositoryDetail) => void;
  repositorySlug: string;
}) {
  const [options, setOptions] = useState<AudienceOption[]>([]);
  const [selectedIds, setSelectedIds] = useState(initialAudienceIds);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<AudienceOption[]>('/audiences')
      .then(setOptions)
      .catch(() => setError('Audience options could not be loaded.'));
  }, []);

  async function save() {
    if (!accessToken) {
      setError(
        'Your session expired. Sign in again before editing this prompt.',
      );
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<PromptRepositoryDetail>(
        `/prompt-repositories/${encodeURIComponent(repositorySlug)}`,
        {
          accessToken,
          body: JSON.stringify({ audienceIds: selectedIds }),
          method: 'PATCH',
        },
      );
      onSaved(updated);
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Audience metadata could not be saved.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="grid gap-5">
      <div>
        <h2 className="text-lg font-semibold">Audience</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Who is this prompt designed for?
        </p>
      </div>
      <AudienceSelector
        disabled={isSaving}
        onChange={setSelectedIds}
        options={options}
        selectedIds={selectedIds}
      />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          disabled={isSaving || selectedIds.length > 5}
          onClick={() => void save()}
        >
          {isSaving ? 'Saving...' : 'Save audience'}
        </Button>
      </div>
    </Card>
  );
}
