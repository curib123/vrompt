'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmationModal } from '@/components/ui/feedback-modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import { trackAnalyticsEvent } from '@/lib/analytics';
import type { CollectionDetail } from '@/lib/api';

export function CollectionsView({ embedded = false }: { embedded?: boolean }) {
  const { accessToken, isLoading, user } = useAuth();
  const [collections, setCollections] = useState<CollectionDetail[] | null>(
    null,
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    let active = true;
    void apiRequest<CollectionDetail[]>('/collections/me', { accessToken })
      .then((response) => {
        if (active) {
          setCollections(response);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError('Collections could not be loaded right now.');
      });
    return () => {
      active = false;
    };
  }, [accessToken, isLoading]);

  async function createCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || saving) return;
    setSaving(true);
    setError(null);
    try {
      const collection = await apiRequest<CollectionDetail>('/collections', {
        accessToken,
        body: JSON.stringify({ description, name, visibility }),
        method: 'POST',
      });
      setCollections((current) =>
        current ? [collection, ...current] : [collection],
      );
      setName('');
      setDescription('');
      trackAnalyticsEvent('collection_created', undefined, accessToken);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Collection could not be created.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveCollection(id: string) {
    if (!accessToken || saving) return;
    setSaving(true);
    try {
      await apiRequest(`/collections/${id}`, { accessToken, method: 'DELETE' });
      setCollections(
        (current) =>
          current?.filter((collection) => collection.id !== id) ?? null,
      );
    } catch {
      setError('Collection could not be archived.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !collections) {
    return error ? (
      <EmptyState description={error} title="Collections unavailable" />
    ) : (
      <Skeleton className="h-96 rounded-[1.5rem]" />
    );
  }

  return (
    <div className={embedded ? 'grid gap-6 pt-4' : 'grid gap-8'}>
      <Card
        className={
          embedded
            ? 'hidden'
            : 'relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white'
        }
      >
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative">
          <Badge className="border-white/30 text-zinc-300">Collections</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            Organize your prompt shelf.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">
            Curate reusable prompts for your work, your team, or the wider
            Vrompt community.
          </p>
        </div>
      </Card>
      <Card>
        <div className="space-y-2">
          <Badge>New collection</Badge>
          <h2 className="text-2xl font-semibold">Start a focused set.</h2>
        </div>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => void createCollection(event)}
        >
          <Input
            aria-label="Collection name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="Collection name"
            required
            value={name}
          />
          <Textarea
            aria-label="Collection description"
            maxLength={2000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What belongs here?"
            value={description}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input
                checked={visibility === 'PUBLIC'}
                onChange={(event) =>
                  setVisibility(event.target.checked ? 'PUBLIC' : 'PRIVATE')
                }
                type="checkbox"
              />
              Public collection
            </label>
            <Button disabled={saving} type="submit">
              {saving ? 'Creating...' : 'Create collection'}
            </Button>
          </div>
        </form>
      </Card>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {collections.length === 0 ? (
        <EmptyState
          description="Create a collection to bring related prompts together."
          title="No collections yet"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {collections.map((collection) => (
            <Card className="flex h-full flex-col" key={collection.id}>
              <div className="flex items-start justify-between gap-4">
                <Badge>{collection.visibility.toLowerCase()}</Badge>
                <Button
                  disabled={saving}
                  onClick={() =>
                    setPendingArchive({
                      id: collection.id,
                      name: collection.name,
                    })
                  }
                  variant="ghost"
                >
                  Archive
                </Button>
              </div>
              <Link
                className="mt-5 flex-1"
                href={
                  `/collections/${collection.owner.username}/${collection.slug}` as Route
                }
              >
                <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                  {collection.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                  {collection.description || 'A curated prompt collection.'}
                </p>
                <p className="mt-5 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {collection.items.length} prompts
                </p>
              </Link>
            </Card>
          ))}
        </div>
      )}
      {user ? (
        <p className="text-xs text-zinc-500">
          Public collections can be shared from your profile.
        </p>
      ) : null}
      <ConfirmationModal
        confirmLabel="Archive collection"
        description={`“${pendingArchive?.name ?? 'This collection'}” will disappear from your active collections. Its prompts will not be deleted.`}
        destructive
        isConfirming={saving}
        onCancel={() => setPendingArchive(null)}
        onConfirm={() => {
          const id = pendingArchive?.id;
          setPendingArchive(null);
          if (id) void archiveCollection(id);
        }}
        open={Boolean(pendingArchive)}
        title="Archive this collection?"
      />
    </div>
  );
}
