'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import type { AdminAudience } from '@/lib/api';

export function AudienceAdmin() {
  const { accessToken, isLoading, user } = useAuth();
  const [audiences, setAudiences] = useState<AdminAudience[] | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      isLoading ||
      !accessToken ||
      !user ||
      !['ADMIN', 'MODERATOR'].includes(user.role)
    )
      return;
    void apiRequest<AdminAudience[]>('/admin/audiences', { accessToken })
      .then(setAudiences)
      .catch(() => setError('Audiences could not be loaded.'));
  }, [accessToken, isLoading, user]);

  if (user && !['ADMIN', 'MODERATOR'].includes(user.role)) {
    return (
      <EmptyState
        actionHref="/"
        actionLabel="Return home"
        description="This area is restricted to moderators and administrators."
        title="Audience access required"
      />
    );
  }

  async function createAudience(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !name.trim()) return;
    try {
      const created = await apiRequest<AdminAudience>('/admin/audiences', {
        accessToken,
        body: JSON.stringify({ name, description: description || undefined }),
        method: 'POST',
      });
      setAudiences((current) => (current ? [...current, created] : [created]));
      setName('');
      setDescription('');
      setError(null);
    } catch (createError: unknown) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Audience could not be created.',
      );
    }
  }

  async function updateAudience(id: string, body: Record<string, unknown>) {
    if (!accessToken) return;
    try {
      const updated = await apiRequest<AdminAudience>(
        `/admin/audiences/${id}`,
        {
          accessToken,
          body: JSON.stringify(body),
          method: 'PATCH',
        },
      );
      setAudiences(
        (current) =>
          current?.map((item) =>
            item.id === id ? { ...item, ...updated } : item,
          ) ?? null,
      );
    } catch (updateError: unknown) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Audience could not be updated.',
      );
    }
  }

  if (!audiences) {
    return (
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {error ?? 'Loading audiences...'}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-8">
      <Card className="grid gap-4 border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <Badge className="!border-white/30 !text-zinc-300">
          Admin / Classification
        </Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          Audiences stay descriptive.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-zinc-300">
          Manage the shared audience vocabulary. Deactivate an audience when it
          is no longer offered; existing relationships remain safe and readable.
        </p>
      </Card>
      <Card>
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end"
          onSubmit={(event) => void createAudience(event)}
        >
          <Input
            aria-label="Audience name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Audience name"
            value={name}
          />
          <Textarea
            aria-label="Audience description"
            className="min-h-11"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Short description"
            value={description}
          />
          <Button type="submit">Create audience</Button>
        </form>
      </Card>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4">
        {audiences.map((audience) => (
          <Card className="grid gap-4" key={audience.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{audience.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Badge>{audience._count.promptAudiences} prompts</Badge>
                  <Badge>{audience._count.userAudiences} interests</Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold">{audience.name}</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {audience.description || 'No description.'}
                </p>
              </div>
              <Button
                onClick={() =>
                  void updateAudience(audience.id, {
                    isActive: !audience.isActive,
                  })
                }
                variant="secondary"
              >
                {audience.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                Order{' '}
                <Input
                  aria-label={`Sort order for ${audience.name}`}
                  className="w-24"
                  min={0}
                  onChange={(event) =>
                    void updateAudience(audience.id, {
                      sortOrder: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={audience.sortOrder}
                />
              </label>
              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                /{audience.slug}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
