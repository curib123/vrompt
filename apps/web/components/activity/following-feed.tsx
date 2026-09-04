'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractivePagination, PageHeader } from '@/components/ui/page';
import { apiRequest } from '@/lib/api';
import type { ActivityFeedResponse } from '@/lib/api';

export function FollowingFeed({ embedded = false }: { embedded?: boolean }) {
  const { accessToken, isLoading } = useAuth();
  const [feed, setFeed] = useState<ActivityFeedResponse | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    let active = true;
    void apiRequest<ActivityFeedResponse>(`/feed?page=${page}&pageSize=20`, {
      accessToken,
    })
      .then((response) => {
        if (active) {
          setFeed(response);
          setError(null);
        }
      })
      .catch(() => {
        if (active)
          setError('Following activity could not be loaded right now.');
      });
    return () => {
      active = false;
    };
  }, [accessToken, isLoading, page]);

  if (!feed)
    return error ? (
      <EmptyState description={error} title="Feed unavailable" />
    ) : (
      <Skeleton className="h-96 rounded-[1.5rem]" />
    );

  return (
    <div className={embedded ? 'grid gap-6 pt-4' : 'grid gap-8'}>
      {embedded ? null : (
        <PageHeader
          eyebrow="Following"
          title="Keep up with useful work"
          description="A focused stream of updates from creators you follow."
        />
      )}
      {feed.items.length === 0 ? (
        <EmptyState
          actionHref="/explore"
          actionLabel="Explore creators"
          description="Follow creators from their profiles to see their latest prompt updates here."
          title="Your following feed is quiet"
        />
      ) : (
        <div className="grid gap-3">
          {feed.items.map((item) => (
            <ActivityCard item={item} key={item.id} />
          ))}
        </div>
      )}
      {feed.total > 0 ? (
        <InteractivePagination
          hasNextPage={feed.hasNextPage}
          onPageChange={setPage}
          page={feed.page}
          total={feed.total}
        />
      ) : null}
    </div>
  );
}

function ActivityCard({
  item,
}: {
  item: ActivityFeedResponse['items'][number];
}) {
  const action =
    item.type === 'REPOSITORY_CREATED'
      ? 'published a prompt'
      : item.type === 'VERSION_PUBLISHED'
        ? 'shared a new update'
        : item.type === 'VARIANT_CREATED'
          ? 'created a variation'
          : 'created a public collection';
  const target = item.promptRepository ? (
    <Link
      className="font-semibold underline"
      href={`/p/${item.promptRepository.slug}`}
    >
      {item.promptRepository.title}
    </Link>
  ) : item.collection ? (
    <Link
      className="font-semibold underline"
      href={`/collections/${item.collection.owner.username}/${item.collection.slug}`}
    >
      {item.collection.name}
    </Link>
  ) : (
    'a prompt'
  );
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm leading-7">
        <Link
          className="font-mono font-semibold"
          href={`/u/${item.actor.username}`}
        >
          @{item.actor.username}
        </Link>{' '}
        {action} {target}.
      </p>
      <time
        className="text-xs text-zinc-600 dark:text-zinc-400"
        dateTime={item.createdAt}
      >
        {formatDate(item.createdAt)}
      </time>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
