'use client';

import { useEffect, useState } from 'react';

import { PromptPreviewCard } from '@/components/prompts/prompt-preview';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmationModal } from '@/components/ui/feedback-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractivePagination } from '@/components/ui/page';
import { apiRequest } from '@/lib/api';
import type { SavedRepositoriesResponse } from '@/lib/api';

export function SavedRepositories({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { accessToken, isLoading } = useAuth();
  const [sort, setSort] = useState<'newest' | 'updated'>('newest');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SavedRepositoriesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    slug: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) {
      return;
    }

    let active = true;
    void apiRequest<SavedRepositoriesResponse>(
      `/saved?page=${page}&pageSize=12&sort=${sort}`,
      { accessToken },
    )
      .then((response) => {
        if (active) {
          setError(null);
          setResult(response);
        }
      })
      .catch(() => {
        if (active) {
          setError('Saved prompts could not be loaded right now.');
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken, isLoading, page, sort]);

  async function remove(slug: string) {
    if (!accessToken || removingSlug) {
      return;
    }

    setRemovingSlug(slug);
    try {
      await apiRequest(
        `/prompt-repositories/${encodeURIComponent(slug)}/save`,
        {
          accessToken,
          method: 'DELETE',
        },
      );
      setResult((current) =>
        current
          ? {
              ...current,
              items: current.items.filter(
                (item) => item.promptRepository.slug !== slug,
              ),
              total: Math.max(current.total - 1, 0),
            }
          : current,
      );
    } catch {
      setError('That prompt could not be removed from your saves.');
    } finally {
      setRemovingSlug(null);
    }
  }

  if (isLoading || !result) {
    return error ? (
      <EmptyState description={error} title="Saved library unavailable" />
    ) : (
      <SavedSkeleton />
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
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge className="!border-white/30 !text-zinc-300">Library</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
              Saved prompts
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-300">
              Keep useful prompt systems close, then return when you are ready
              to build with them.
            </p>
          </div>
          <label className="grid gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400">
            Sort by
            <select
              className="min-h-11 rounded-full border border-white/20 bg-white/10 px-4 text-sm normal-case tracking-normal text-white outline-none"
              onChange={(event) => {
                setSort(event.target.value as 'newest' | 'updated');
                setPage(1);
              }}
              value={sort}
            >
              <option className="text-black" value="newest">
                Recently saved
              </option>
              <option className="text-black" value="updated">
                Recently updated
              </option>
            </select>
          </label>
        </div>
      </Card>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {result.items.length === 0 ? (
        <EmptyState
          actionHref="/explore"
          actionLabel="Explore prompts"
          description="Save prompts from their detail page and they will appear here."
          title="Your library is empty"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {result.items.map((item) => {
            const repository = item.promptRepository;
            return (
              <Card className="flex h-full flex-col" key={repository.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{repository.visibility.toLowerCase()}</Badge>
                    {repository.category ? (
                      <Badge>{repository.category.name}</Badge>
                    ) : null}
                    {repository.promptAudiences
                      .slice(0, 2)
                      .map(({ audience }) => (
                        <Badge key={audience.slug}>{audience.name}</Badge>
                      ))}
                  </div>
                  <Button
                    disabled={removingSlug === repository.slug}
                    onClick={() =>
                      setPendingRemoval({
                        slug: repository.slug,
                        title: repository.title,
                      })
                    }
                    variant="ghost"
                  >
                    {removingSlug === repository.slug
                      ? 'Removing...'
                      : 'Remove'}
                  </Button>
                </div>
                <PromptPreviewCard
                  className="mt-5 flex-1 border-0 bg-transparent p-0 shadow-none hover:translate-y-0 hover:border-transparent focus-visible:outline-offset-4 sm:p-0 dark:border-0 dark:bg-transparent dark:hover:border-transparent"
                  description={repository.description}
                  slug={repository.slug}
                  title={repository.title}
                >
                  <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                    {repository.title}
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                    {repository.description || 'A reusable prompt.'}
                  </p>
                </PromptPreviewCard>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>by @{repository.owner.username}</span>
                  <span>Saved {formatDate(item.createdAt)}</span>
                  <span>Updated {formatDate(repository.updatedAt)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {result.total > 0 ? (
        <InteractivePagination
          hasNextPage={result.hasNextPage}
          onPageChange={setPage}
          page={result.page}
          total={result.total}
        />
      ) : null}
      <ConfirmationModal
        confirmLabel="Remove saved prompt"
        description={`“${pendingRemoval?.title ?? 'This prompt'}” will be removed from your saved library. The original prompt will not be deleted.`}
        destructive
        isConfirming={Boolean(removingSlug)}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          const slug = pendingRemoval?.slug;
          setPendingRemoval(null);
          if (slug) void remove(slug);
        }}
        open={Boolean(pendingRemoval)}
        title="Remove from saved prompts?"
      />
    </div>
  );
}

function SavedSkeleton() {
  return (
    <div className="grid gap-8">
      <Skeleton className="h-64 rounded-[1.5rem]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-[1.5rem]" />
        <Skeleton className="h-64 rounded-[1.5rem]" />
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
