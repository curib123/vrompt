'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { PromptPreviewCard } from '@/components/prompts/prompt-preview';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { usePublicSettings } from '@/components/providers/public-settings-provider';
import type { ExploreRepository, ExploreResponse } from '@/lib/api';

export function ExploreView({
  initialExplore = null,
}: {
  initialExplore?: ExploreResponse | null;
}) {
  const [explore, setExplore] = useState<ExploreResponse | null>(
    initialExplore,
  );
  const [error, setError] = useState(false);
  const { accessToken } = useAuth();
  const publicSettings = usePublicSettings();

  useEffect(() => {
    if (initialExplore && !accessToken) return;

    let active = true;
    void apiRequest<ExploreResponse>('/search/explore')
      .then((response) => {
        if (active) setExplore(response);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [accessToken, initialExplore]);

  if (!explore) {
    return error ? (
      <EmptyState
        actionHref="/search"
        actionLabel="Search prompts"
        description="Explore is unavailable right now."
        title="Discovery unavailable"
      />
    ) : (
      <ExploreSkeleton />
    );
  }

  return (
    <div className="grid min-w-0 gap-10 sm:gap-14">
      <header className="max-w-3xl border-b border-[#E6E6E6] pb-8 dark:border-[#1A1A1A]">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400">
          Prompt library
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
          Explore prompts.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base dark:text-zinc-400">
          Browse useful prompts shaped by real creators and proven through
          practical work.
        </p>
      </header>
      {publicSettings['features.showRecommendations'] &&
      explore.recommendedForYou.length > 0 ? (
        <ExploreSection
          items={explore.recommendedForYou}
          onOpen={() => trackAnalyticsEvent('recommended_prompt_opened')}
          title="Recommended for you"
        />
      ) : null}
      <ExploreSection items={explore.featured} title="Featured" />
      <div className="grid gap-10 lg:grid-cols-2">
        <ExploreSection items={explore.popular} title="Popular" />
        <ExploreSection
          items={explore.recentlyUpdated}
          title="Recently updated"
        />
        <ExploreSection
          items={explore.mostCopied}
          title="Most copied"
          metric="copies"
        />
        <ExploreSection
          items={explore.mostSaved}
          title="Most saved"
          metric="saves"
        />
        <ExploreSection
          items={explore.mostVariants}
          title="Most variations"
          metric="variants"
        />
      </div>
      <section className="grid gap-5">
        <SectionHeading showSwipe={false} title="Categories" />
        <div className="flex flex-wrap gap-3">
          {explore.categories.map((category) => (
            <Link
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white"
              href={`/search?category=${encodeURIComponent(category.slug)}`}
              key={category.id}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>
      {explore.starterCollections.length > 0 ? (
        <section className="grid gap-5">
          <SectionHeading showSwipe={false} title="Starter collections" />
          <div className="grid gap-4 md:grid-cols-2">
            {explore.starterCollections.map((collection) => (
              <Link
                href={`/collections/${collection.owner.username}/${collection.slug}`}
                key={collection.id}
              >
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-black dark:hover:border-white">
                  <Badge>{collection._count.items} prompts</Badge>
                  <h2 className="mt-4 break-words text-2xl font-semibold">
                    {collection.name}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                    {collection.description || 'A focused prompt collection.'}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ExploreSection({
  items,
  metric,
  onOpen,
  title,
}: {
  items: ExploreRepository[];
  metric?: 'copies' | 'saves' | 'variants';
  onOpen?: () => void;
  title: string;
}) {
  return (
    <section className="grid min-w-0 gap-5">
      <SectionHeading title={title} />
      {items.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No prompts in this view yet.
        </p>
      ) : (
        <div className="grid min-w-0 max-w-full auto-cols-[minmax(17rem,85vw)] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain pb-3 pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:auto-cols-auto md:grid-flow-row md:grid-cols-2 md:overflow-visible md:pb-0 md:pr-0">
          {items.slice(0, 4).map((item) => (
            <RepositoryCard
              item={item}
              key={item.id}
              metric={metric}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RepositoryCard({
  item,
  metric,
  onOpen,
}: {
  item: ExploreRepository;
  metric?: 'copies' | 'saves' | 'variants';
  onOpen?: () => void;
}) {
  const value =
    metric === 'copies'
      ? item.copyCount
      : metric === 'saves'
        ? item.saveCount
        : metric === 'variants'
          ? item.variantCount
          : item.likeCount;
  return (
    <PromptPreviewCard
      className="h-full min-h-52 snap-start"
      description={item.description}
      onOpen={onOpen}
      slug={item.slug}
      title={item.title}
    >
      <div className="flex flex-wrap gap-2">
        {item.category ? <Badge>{item.category.name}</Badge> : null}
        {item.promptAudiences.slice(0, 2).map(({ audience }) => (
          <Badge key={audience.slug}>{audience.name}</Badge>
        ))}
        {item.owner.accountType !== 'REAL' ? (
          <Badge>{item.owner.accountType.toLowerCase()}</Badge>
        ) : null}
        {item.origin === 'AI_GENERATED' ? <Badge>AI-generated</Badge> : null}
        {item.origin === 'IMPORTED' ? <Badge>Imported</Badge> : null}
        <Badge>
          {value}{' '}
          {metric === 'copies'
            ? 'shares'
            : metric === 'saves'
              ? 'saves'
              : metric === 'variants'
                ? 'variations'
                : 'likes'}
        </Badge>
      </div>
      <h3 className="mt-4 break-words text-xl font-semibold tracking-tight">
        {item.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {item.description || 'A reusable prompt.'}
      </p>
      <p className="mt-5 text-xs text-zinc-600 dark:text-zinc-400">
        by @{item.owner.username}
      </p>
    </PromptPreviewCard>
  );
}

function SectionHeading({
  showSwipe = true,
  title,
}: {
  showSwipe?: boolean;
  title: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-2 min-[360px]:flex-row min-[360px]:items-end min-[360px]:justify-between min-[360px]:gap-4">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-600 dark:text-zinc-400">
          Prompt library
        </p>
        <h2 className="mt-2 break-words text-2xl font-semibold tracking-[-0.05em] sm:text-3xl">
          {title}
        </h2>
      </div>
      {showSwipe ? (
        <p className="text-xs font-medium text-zinc-600 min-[360px]:pb-1 md:hidden dark:text-zinc-400">
          Swipe to browse
        </p>
      ) : null}
    </div>
  );
}
function ExploreSkeleton() {
  return (
    <div className="grid gap-10" role="status">
      <span className="sr-only">Loading prompt recommendations</span>
      <div className="grid max-w-3xl gap-4 border-b border-[#E6E6E6] pb-8 dark:border-[#1A1A1A]">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-14 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-[1.5rem]" />
        <Skeleton className="hidden h-48 rounded-[1.5rem] sm:block" />
      </div>
    </div>
  );
}
