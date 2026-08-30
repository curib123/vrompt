'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type { ExploreRepository, ExploreResponse } from '@/lib/api';

export function ExploreView() {
  const [explore, setExplore] = useState<ExploreResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
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
  }, []);

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
    <div className="grid gap-10">
      <Card className="relative overflow-hidden !border-[#0D0D0D] !bg-[#0D0D0D] !text-white dark:!border-white">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative max-w-4xl space-y-5">
          <Badge className="border-white/40 !text-white">Discover</Badge>
          <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.07em] !text-white sm:text-7xl">
            Useful prompts, less wandering.
          </h1>
          <p className="max-w-2xl text-base leading-8 !text-zinc-200">
            Explore real prompt activity, shaped by what creators and
            collaborators are sharing.
          </p>
          <form
            action="/search"
            className="grid gap-3 rounded-[1.5rem] border border-white/20 bg-white p-3 text-[#0D0D0D] shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-4"
            method="get"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                aria-label="Search prompts"
                className="border-[#E6E6E6] bg-white !text-[#0D0D0D] placeholder:!text-[#4D4D4D] dark:border-[#E6E6E6] dark:bg-white dark:!text-[#0D0D0D]"
                name="q"
                placeholder="What do you want AI to help you do?"
                type="search"
              />
              <Button
                className="w-full whitespace-nowrap bg-[#0D0D0D] !text-white dark:bg-[#0D0D0D] dark:!text-white sm:w-auto"
                type="submit"
              >
                Search prompts
              </Button>
            </div>
            <details className="group rounded-2xl border border-[#E6E6E6] bg-[#F7F7F7] open:bg-white">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-2 text-sm font-semibold text-[#0D0D0D] marker:hidden">
                Advanced filters
                <span
                  aria-hidden="true"
                  className="text-xl font-normal leading-none transition group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="grid gap-3 border-t border-[#E6E6E6] p-3 sm:grid-cols-3">
                <label className="grid gap-1.5 text-xs font-semibold text-[#4D4D4D]">
                  Category
                  <select
                    className="min-h-11 w-full rounded-2xl border border-[#E6E6E6] bg-white px-4 text-sm font-normal text-[#0D0D0D] outline-none focus:border-[#0D0D0D]"
                    name="category"
                  >
                    <option value="">All categories</option>
                    {explore.categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#4D4D4D]">
                  AI compatibility
                  <Input
                    className="border-[#E6E6E6] bg-white !text-[#0D0D0D] placeholder:!text-[#4D4D4D] dark:border-[#E6E6E6] dark:bg-white dark:!text-[#0D0D0D]"
                    name="aiCompatibility"
                    placeholder="Any AI model"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#4D4D4D]">
                  Sort results
                  <select
                    className="min-h-11 w-full rounded-2xl border border-[#E6E6E6] bg-white px-4 text-sm font-normal text-[#0D0D0D] outline-none focus:border-[#0D0D0D]"
                    defaultValue="relevance"
                    name="sort"
                  >
                    <option value="relevance">Most relevant</option>
                    <option value="newest">Newest</option>
                    <option value="updated">Recently updated</option>
                    <option value="copies">Most copied</option>
                    <option value="saves">Most saved</option>
                    <option value="likes">Most liked</option>
                  </select>
                </label>
              </div>
            </details>
          </form>
          <Link
            className="inline-flex text-sm font-semibold !text-white underline underline-offset-4"
            href="/search"
          >
            Search all prompts
          </Link>
        </div>
      </Card>
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
        <SectionHeading title="Categories" />
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
          <SectionHeading title="Starter collections" />
          <div className="grid gap-4 md:grid-cols-2">
            {explore.starterCollections.map((collection) => (
              <Link
                href={`/collections/${collection.owner.username}/${collection.slug}`}
                key={collection.id}
              >
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-black dark:hover:border-white">
                  <Badge>{collection._count.items} prompts</Badge>
                  <h2 className="mt-4 text-2xl font-semibold">
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
  title,
}: {
  items: ExploreRepository[];
  metric?: 'copies' | 'saves' | 'variants';
  title: string;
}) {
  return (
    <section className="grid gap-5">
      <SectionHeading title={title} />
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No prompts in this view yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.slice(0, 6).map((item) => (
            <RepositoryCard item={item} key={item.id} metric={metric} />
          ))}
        </div>
      )}
    </section>
  );
}

function RepositoryCard({
  item,
  metric,
}: {
  item: ExploreRepository;
  metric?: 'copies' | 'saves' | 'variants';
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
    <Link href={`/p/${item.slug}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-black dark:hover:border-white">
        <div className="flex flex-wrap gap-2">
          {item.category ? <Badge>{item.category.name}</Badge> : null}
          {item.owner.accountType !== 'REAL' ? (
            <Badge>{item.owner.accountType.toLowerCase()}</Badge>
          ) : null}
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
        <h3 className="mt-4 text-xl font-semibold tracking-tight">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {item.description || 'A reusable prompt.'}
        </p>
        <p className="mt-5 text-xs text-zinc-500">by @{item.owner.username}</p>
      </Card>
    </Link>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
        Prompt library
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
        {title}
      </h2>
    </div>
  );
}
function ExploreSkeleton() {
  return (
    <div className="grid gap-8">
      <Skeleton className="h-72 rounded-[1.5rem]" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-[1.5rem]" />
        <Skeleton className="h-56 rounded-[1.5rem]" />
      </div>
    </div>
  );
}
