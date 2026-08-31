'use client';

import { useEffect, useState } from 'react';

import { PromptPreviewCard } from '@/components/prompts/prompt-preview';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type { CollectionDetail } from '@/lib/api';

export function CollectionDetailView({
  username,
  slug,
  initialCollection = null,
}: {
  username: string;
  slug: string;
  initialCollection?: CollectionDetail | null;
}) {
  const { accessToken, isLoading } = useAuth();
  const [collection, setCollection] = useState<CollectionDetail | null>(
    initialCollection,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    let active = true;
    void apiRequest<CollectionDetail>(
      `/collections/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
      { accessToken: accessToken ?? undefined },
    )
      .then((response) => {
        if (active) setCollection(response);
      })
      .catch(() => {
        if (active)
          setError(
            'This collection is private, unavailable, or does not exist.',
          );
      });
    return () => {
      active = false;
    };
  }, [accessToken, isLoading, slug, username]);

  if (!collection && !error)
    return <Skeleton className="h-96 rounded-[1.5rem]" />;
  if (!collection)
    return (
      <EmptyState
        actionHref="/collections"
        actionLabel="View collections"
        description={error ?? 'Collection unavailable.'}
        title="Collection unavailable"
      />
    );

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="relative space-y-4">
          <Badge className="!border-white/30 !text-zinc-300">
            {collection.visibility.toLowerCase()} collection
          </Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-7xl">
            {collection.name}
          </h1>
          <p className="max-w-2xl text-base leading-8 text-zinc-300">
            {collection.description || 'A curated prompt collection.'}
          </p>
          <p className="text-sm text-zinc-400">
            Curated by @{collection.owner.username} / {collection.items.length}{' '}
            prompts
          </p>
        </div>
      </Card>
      {collection.items.length === 0 ? (
        <EmptyState
          description="Prompts will appear here as the collection grows."
          title="This collection is empty"
        />
      ) : (
        <div className="grid gap-4">
          {collection.items.map((item, index) => (
            <PromptPreviewCard
              description={item.promptRepository.description}
              key={item.promptRepositoryId}
              slug={item.promptRepository.slug}
              title={item.promptRepository.title}
            >
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                {String(index + 1).padStart(2, '0')} / @
                {item.promptRepository.owner.username}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                {item.promptRepository.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                {item.promptRepository.description || 'A reusable prompt.'}
              </p>
            </PromptPreviewCard>
          ))}
        </div>
      )}
    </div>
  );
}
