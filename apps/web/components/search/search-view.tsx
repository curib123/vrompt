'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { apiRequest } from '@/lib/api';
import type { SearchResponse, SearchResult } from '@/lib/api';

type Sort = 'relevance' | 'newest' | 'updated' | 'copies' | 'saves' | 'likes';
type Filters = { ai: string; category: string; query: string; sort: Sort };

export function SearchView({
  initialAi,
  initialCategory,
  initialPage = 1,
  initialQuery,
  initialResult,
  initialSort,
}: {
  initialAi?: string;
  initialCategory?: string;
  initialPage?: number;
  initialQuery?: string;
  initialResult?: SearchResponse | null;
  initialSort?: string;
}) {
  const router = useRouter();
  const startingFilters: Filters = {
    ai: initialAi ?? '',
    category: initialCategory ?? '',
    query: initialQuery ?? '',
    sort: isSort(initialSort) ? initialSort : 'relevance',
  };
  const [query, setQuery] = useState(startingFilters.query);
  const [category, setCategory] = useState(startingFilters.category);
  const [ai, setAi] = useState(startingFilters.ai);
  const [sort, setSort] = useState<Sort>(startingFilters.sort);
  const [appliedFilters, setAppliedFilters] = useState(startingFilters);
  const [page, setPage] = useState(initialPage);
  const [result, setResult] = useState<SearchResponse | null>(
    initialResult ?? null,
  );
  const [error, setError] = useState<string | null>(
    initialResult ? null : 'We could not load prompts. Search to try again.',
  );
  const [isSearching, setIsSearching] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function runSearch(filters: Filters, nextPage: number) {
    setIsSearching(true);
    setError(null);
    const params = toSearchParams(filters, nextPage);

    try {
      const response = await apiRequest<SearchResponse>(
        `/search?${params.toString()}`,
      );
      setResult(response);
      trackAnalyticsEvent('search_performed', {
        resultCount: response.total,
      });
    } catch {
      setError('We could not refresh these prompts. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = { ai, category, query, sort };
    const params = toSearchParams(nextFilters, 1);
    params.delete('page');
    setAppliedFilters(nextFilters);
    setPage(1);
    router.replace(`/search?${params.toString()}` as Route, { scroll: false });
    void runSearch(nextFilters, 1);
  }

  function changePage(nextPage: number) {
    const safePage = Math.max(nextPage, 1);
    const params = toSearchParams(appliedFilters, safePage);
    setPage(safePage);
    router.replace(`/search?${params.toString()}` as Route, { scroll: false });
    void runSearch(appliedFilters, safePage).then(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const activeFilterCount =
    Number(Boolean(category.trim())) +
    Number(Boolean(ai.trim())) +
    Number(sort !== 'relevance');

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden rounded-[2rem] !border-[#0D0D0D] !bg-[#0D0D0D] p-5 !text-white dark:!border-white sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative space-y-4">
          <Badge className="border-white/30 text-zinc-300">Discover</Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
            Find a better prompt.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Describe the outcome you want. Search across prompt ideas,
            creators, topics, and tools.
          </p>
        </div>
      </Card>

      <Card className="rounded-[2rem] p-4 sm:p-6">
        <form className="grid gap-4" onSubmit={applyFilters} role="search">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              aria-label="Search query"
              className="min-h-12"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What do you want AI to help you do?"
              type="search"
              value={query}
            />
            <Button
              className="min-h-12 w-full whitespace-nowrap sm:w-auto"
              disabled={isSearching}
              type="submit"
            >
              {isSearching ? 'Searching...' : 'Search prompts'}
            </Button>
          </div>

          <details
            className="group rounded-2xl border border-[#E6E6E6] open:bg-[#F7F7F7] dark:border-[#4D4D4D] dark:open:bg-[#111111]"
            open={activeFilterCount > 0 || undefined}
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-2 text-sm font-semibold marker:hidden">
              <span>
                Refine results
                {activeFilterCount > 0 ? (
                  <span className="ml-2 rounded-full bg-[#0D0D0D] px-2 py-0.5 text-xs text-white dark:bg-white dark:text-[#0D0D0D]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className="text-xl font-normal transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="grid gap-3 border-t border-[#E6E6E6] p-3 sm:grid-cols-3 dark:border-[#4D4D4D]">
              <Input
                aria-label="Category filter"
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Topic or category"
                value={category}
              />
              <Input
                aria-label="AI compatibility filter"
                onChange={(event) => setAi(event.target.value)}
                placeholder="AI tool or model"
                value={ai}
              />
              <select
                aria-label="Sort results"
                className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-[#0D0D0D] dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                onChange={(event) => setSort(event.target.value as Sort)}
                value={sort}
              >
                <option value="relevance">Best match</option>
                <option value="newest">Newest</option>
                <option value="updated">Recently improved</option>
                <option value="copies">Most copied</option>
                <option value="saves">Most saved</option>
                <option value="likes">Most liked</option>
              </select>
            </div>
          </details>
        </form>
      </Card>

      <div
        aria-busy={isSearching}
        className="grid scroll-mt-24 gap-5"
        ref={resultsRef}
      >
        {error ? (
          <div
            className="rounded-2xl border border-[#E6E6E6] bg-[#F7F7F7] px-4 py-3 text-sm text-[#4D4D4D] dark:border-[#4D4D4D] dark:bg-[#111111] dark:text-[#BDBDBD]"
            role="status"
          >
            {error}
          </div>
        ) : null}

        {!result ? <SearchSkeleton /> : null}

        {result && result.items.length === 0 ? (
          <EmptyState
            actionHref="/explore"
            actionLabel="Browse popular prompts"
            description="Try fewer words or remove a filter. You can also browse what the community is using now."
            title="No close matches yet"
          />
        ) : null}

        {result && result.items.length > 0 ? (
          <>
            <div
              aria-live="polite"
              className="flex items-end justify-between gap-3"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Prompt library
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
                  {appliedFilters.query.trim()
                    ? result.total === 1
                      ? '1 match'
                      : `${result.total} matches`
                    : `${result.total} prompts to explore`}
                </h2>
              </div>
              <p className="text-xs text-zinc-500">Page {result.page}</p>
            </div>
            <div
              className={`grid gap-4 transition-opacity md:grid-cols-2 ${
                isSearching ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {result.items.map((item) => (
                <ResultCard
                  item={item}
                  key={item.id}
                  query={appliedFilters.query}
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[#E6E6E6] pt-5 dark:border-[#1A1A1A]">
              <Button
                disabled={page <= 1 || isSearching}
                onClick={() => changePage(page - 1)}
                variant="secondary"
              >
                Previous
              </Button>
              <span className="text-xs font-medium text-zinc-500">
                Page {page}
              </span>
              <Button
                disabled={!result.hasNextPage || isSearching}
                onClick={() => changePage(page + 1)}
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ResultCard({ item, query }: { item: SearchResult; query: string }) {
  return (
    <Link className="group" href={`/p/${item.slug}`}>
      <Card className="flex h-full min-h-60 flex-col transition group-hover:-translate-y-0.5 group-hover:border-black dark:group-hover:border-white">
        <div className="flex flex-wrap gap-2">
          {item.category ? <Badge>{item.category.name}</Badge> : null}
          {item.aiCompatibility ? <Badge>{item.aiCompatibility}</Badge> : null}
          {item.owner.accountType !== 'REAL' ? (
            <Badge>Vrompt pick</Badge>
          ) : null}
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] group-hover:underline group-hover:decoration-[#BDBDBD] group-hover:underline-offset-4">
          {highlight(item.title, query)}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {highlight(item.description || 'A reusable prompt.', query)}
        </p>
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-6 text-xs text-zinc-500">
          <span>By @{item.owner.username}</span>
          <span>{item.copyCount} copies</span>
          <span>{item.saveCount} saves</span>
          <span>{item.likeCount} likes</span>
        </div>
        {item.promptTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.promptTags.slice(0, 4).map(({ tag }) => (
              <Badge key={tag.slug}>{highlight(tag.name, query)}</Badge>
            ))}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}

function toSearchParams(filters: Filters, page: number) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.category.trim()) params.set('category', filters.category.trim());
  if (filters.ai.trim()) params.set('aiCompatibility', filters.ai.trim());
  if (filters.sort !== 'relevance') params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));
  return params;
}

function highlight(value: string, query: string) {
  if (!query.trim()) return value;
  const parts = value.split(
    new RegExp(`(${escapeRegExp(query.trim())})`, 'ig'),
  );
  return parts.map((part, index) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark
        className="rounded bg-zinc-200 px-1 dark:bg-zinc-700"
        key={`${part}-${index}`}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isSort(value?: string): value is Sort {
  return [
    'relevance',
    'newest',
    'updated',
    'copies',
    'saves',
    'likes',
  ].includes(value ?? '');
}

function SearchSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" role="status">
      <span className="sr-only">Finding useful prompts</span>
      <Skeleton className="h-56 rounded-[1.5rem]" />
      <Skeleton className="hidden h-56 rounded-[1.5rem] md:block" />
    </div>
  );
}
