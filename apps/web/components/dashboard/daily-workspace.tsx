'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button, getButtonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, updatePromptReuse } from '@/lib/api';
import type {
  OwnedPromptRepository,
  SavedRepositoriesResponse,
} from '@/lib/api';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { getPublicPromptPath } from '@/lib/prompt-sharing';

type DashboardData = {
  saved: SavedRepositoriesResponse;
  owned: OwnedPromptRepository[];
};

export function DailyWorkspace() {
  const { accessToken, isLoading, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !accessToken) return;
    let active = true;
    void Promise.all([
      apiRequest<SavedRepositoriesResponse>(
        '/saved?page=1&pageSize=30&sort=newest',
        { accessToken },
      ),
      apiRequest<OwnedPromptRepository[]>('/prompt-repositories/mine', {
        accessToken,
      }),
    ])
      .then(([saved, owned]) => {
        if (active) setData({ saved, owned });
      })
      .catch(() => {
        if (active) setError('Your workspace could not be loaded. Try again.');
      });
    return () => {
      active = false;
    };
  }, [accessToken, isLoading]);

  const pinned = useMemo(
    () => data?.saved.items.filter((item) => item.isPinned) ?? [],
    [data],
  );
  const favorites = useMemo(
    () => data?.saved.items.filter((item) => item.isFavorite) ?? [],
    [data],
  );
  const recent = useMemo(
    () =>
      data?.saved.items
        .slice()
        .sort(
          (a, b) =>
            new Date(b.lastUsedAt ?? b.createdAt).getTime() -
            new Date(a.lastUsedAt ?? a.createdAt).getTime(),
        )
        .slice(0, 6) ?? [],
    [data],
  );

  async function usePrompt(id: string, slug: string) {
    if (!accessToken || busy) return;
    setBusy(slug);
    try {
      await updatePromptReuse(slug, 'use', accessToken);
      trackAnalyticsEvent('prompt_reused', undefined, accessToken);
      window.location.assign(getPublicPromptPath(id, slug));
    } catch {
      setError('This prompt could not be opened for reuse.');
    } finally {
      setBusy(null);
    }
  }

  async function toggle(
    slug: string,
    action: 'favorite' | 'unfavorite' | 'pin' | 'unpin',
  ) {
    if (!accessToken || busy) return;
    setBusy(`${action}:${slug}`);
    try {
      await updatePromptReuse(slug, action, accessToken);
      setData((current) =>
        current
          ? {
              ...current,
              saved: {
                ...current.saved,
                items: current.saved.items.map((item) =>
                  item.promptRepository.slug === slug
                    ? {
                        ...item,
                        isFavorite:
                          action === 'favorite'
                            ? true
                            : action === 'unfavorite'
                              ? false
                              : item.isFavorite,
                        isPinned:
                          action === 'pin'
                            ? true
                            : action === 'unpin'
                              ? false
                              : item.isPinned,
                      }
                    : item,
                ),
              },
            }
          : current,
      );
      trackAnalyticsEvent(
        action === 'favorite' || action === 'unfavorite'
          ? action === 'favorite'
            ? 'prompt_favorited'
            : 'prompt_unfavorited'
          : action === 'pin'
            ? 'prompt_pinned'
            : 'prompt_unpinned',
        undefined,
        accessToken,
      );
    } catch {
      setError('That change could not be saved.');
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !data)
    return error ? (
      <EmptyState description={error} title="Workspace unavailable" />
    ) : (
      <Skeleton className="h-96 rounded-[1.5rem]" />
    );

  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0D0D0D] p-6 text-white shadow-[0_24px_70px_rgba(13,13,13,0.16)] sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Badge className="!border-white/30 !text-zinc-300">Today</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
              What do you need help with today?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
              Turn a repeated task into a reusable workflow you can use again
              tomorrow.
            </p>
          </div>
          <Link
            className={getButtonClasses(
              'secondary',
              'w-full border-white bg-white !text-on-light sm:w-auto',
            )}
            href={'/generate' as Route}
          >
            Generate a prompt
          </Link>
        </div>
      </section>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <WorkspaceSection
        title="Pinned prompts"
        description="Your fastest shortcuts for recurring work."
        empty="Pin the prompts you use most often."
      >
        {pinned.map((item) => (
          <PromptRow
            busy={busy}
            item={item}
            key={item.promptRepository.id}
            onFavorite={toggle}
            onPin={toggle}
            onUse={usePrompt}
          />
        ))}
      </WorkspaceSection>
      <WorkspaceSection
        title="Use again"
        description="Pick up a prompt where you last used it."
        empty="Saved prompts you use will appear here."
      >
        {recent.map((item) => (
          <PromptRow
            busy={busy}
            item={item}
            key={item.promptRepository.id}
            onFavorite={toggle}
            onPin={toggle}
            onUse={usePrompt}
          />
        ))}
      </WorkspaceSection>
      <div className="grid gap-4 lg:grid-cols-2">
        <WorkspaceSection
          title="Favorites"
          description="Prompts worth keeping close."
          empty="Favorite a saved prompt to find it here."
        >
          {favorites.map((item) => (
            <PromptRow
              busy={busy}
              item={item}
              key={item.promptRepository.id}
              onFavorite={toggle}
              onPin={toggle}
              onUse={usePrompt}
            />
          ))}
        </WorkspaceSection>
        <WorkspaceSection
          title="Continue editing"
          description="Your prompts and drafts, ready for the next update."
          empty="Create your first prompt to start building."
        >
          {data.owned.slice(0, 6).map((item) => (
            <Link
              className="rounded-2xl border border-zinc-200 p-4 transition hover:border-black dark:border-zinc-800 dark:hover:border-white"
              href={getPublicPromptPath(item.id, item.slug)}
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{item.title}</strong>
                <Badge>{item.visibility.toLowerCase()}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {item.description || 'Continue shaping this prompt.'}
              </p>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Updated {new Date(item.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </WorkspaceSection>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          className={getButtonClasses('secondary')}
          href={'/search' as Route}
        >
          Find a prompt
        </Link>
        <Link
          className={getButtonClasses('secondary')}
          href={('/u/' + user?.username) as Route}
        >
          Open my profile
        </Link>
        <Link
          className={getButtonClasses('secondary')}
          href={'/create' as Route}
        >
          Manage prompts
        </Link>
      </div>
    </div>
  );
}

function WorkspaceSection({
  title,
  description,
  empty,
  children,
}: {
  title: string;
  description: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {hasChildren ? (
        <div className="grid gap-3 md:grid-cols-2">{children}</div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {empty}
        </p>
      )}
    </section>
  );
}

function PromptRow({
  item,
  busy,
  onUse,
  onFavorite,
  onPin,
}: {
  item: SavedRepositoriesResponse['items'][number];
  busy: string | null;
  onUse: (id: string, slug: string) => void;
  onFavorite: (
    slug: string,
    action: 'favorite' | 'unfavorite' | 'pin' | 'unpin',
  ) => void;
  onPin: (
    slug: string,
    action: 'favorite' | 'unfavorite' | 'pin' | 'unpin',
  ) => void;
}) {
  const prompt = item.promptRepository;
  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <Link
          className="min-w-0"
          href={getPublicPromptPath(prompt.id, prompt.slug)}
        >
          <h3 className="truncate text-lg font-semibold">{prompt.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {prompt.description || 'A reusable prompt.'}
          </p>
        </Link>
        <div className="flex shrink-0 gap-1">
          <Button
            aria-label={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
            disabled={Boolean(busy)}
            onClick={() =>
              onFavorite(
                prompt.slug,
                item.isFavorite ? 'unfavorite' : 'favorite',
              )
            }
            variant="ghost"
          >
            {item.isFavorite ? '★' : '☆'}
          </Button>
          <Button
            aria-label={item.isPinned ? 'Unpin prompt' : 'Pin prompt'}
            disabled={Boolean(busy)}
            onClick={() => onPin(prompt.slug, item.isPinned ? 'unpin' : 'pin')}
            variant="ghost"
          >
            {item.isPinned ? '📌' : '＋'}
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {item.useCount} use{item.useCount === 1 ? '' : 's'}
          {item.lastUsedAt
            ? ` · Last used ${new Date(item.lastUsedAt).toLocaleDateString()}`
            : ''}
        </span>
        <Button
          disabled={Boolean(busy)}
          onClick={() => onUse(prompt.id, prompt.slug)}
        >
          Use again
        </Button>
      </div>
    </div>
  );
}
