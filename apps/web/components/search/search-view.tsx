'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Route } from 'next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type { SearchResponse, SearchResult } from '@/lib/api';

type Sort = 'relevance' | 'newest' | 'updated' | 'copies' | 'saves' | 'likes';

export function SearchView({
  initialAi,
  initialCategory,
  initialQuery,
  initialSort,
}: {
  initialAi?: string;
  initialCategory?: string;
  initialQuery?: string;
  initialSort?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [category, setCategory] = useState(initialCategory ?? '');
  const [ai, setAi] = useState(initialAi ?? '');
  const [sort, setSort] = useState<Sort>(
    isSort(initialSort) ? initialSort : 'relevance',
  );
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category.trim()) params.set('category', category.trim());
    if (ai.trim()) params.set('ai', ai.trim());
    if (sort !== 'relevance') params.set('sort', sort);
    params.set('page', String(page));
    void apiRequest<SearchResponse>(`/search?${params.toString()}`)
      .then((response) => {
        if (active) {
          setResult(response);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError('Search is unavailable right now.');
      });
    return () => {
      active = false;
    };
  }, [ai, category, page, query, sort]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category.trim()) params.set('category', category.trim());
    if (ai.trim()) params.set('ai', ai.trim());
    if (sort !== 'relevance') params.set('sort', sort);
    router.replace(`/search?${params.toString()}` as Route);
  }

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border-[40px] border-white/10" />
        <div className="relative space-y-4">
          <Badge className="border-white/30 text-zinc-300">Discover</Badge>
          <h1 className="text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">
            Find a better prompt.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-zinc-300">
            Search titles, descriptions, prompt content, creators, categories,
            and tags across public Vrompt repositories.
          </p>
        </div>
      </Card>
      <Card>
        <form className="grid gap-4" onSubmit={applyFilters}>
          <Input
            aria-label="Search query"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: onboarding assistant, research, JSON..."
            value={query}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              aria-label="Category filter"
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Category slug"
              value={category}
            />
            <Input
              aria-label="AI compatibility filter"
              onChange={(event) => setAi(event.target.value)}
              placeholder="AI compatibility"
              value={ai}
            />
            <select
              aria-label="Sort results"
              className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              onChange={(event) => {
                setSort(event.target.value as Sort);
                setPage(1);
              }}
              value={sort}
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="updated">Recently updated</option>
              <option value="copies">Most copied</option>
              <option value="saves">Most saved</option>
              <option value="likes">Most liked</option>
            </select>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Search repositories</Button>
          </div>
        </form>
      </Card>
      {error ? (
        <EmptyState
          actionHref="/search"
          actionLabel="Try again"
          description={error}
          title="Search unavailable"
        />
      ) : null}
      {!error && !result ? <SearchSkeleton /> : null}
      {result && result.items.length === 0 ? (
        <EmptyState
          actionHref="/create"
          actionLabel="Create a prompt"
          description="Try a broader query or create the repository you wish existed."
          title="No repositories found"
        />
      ) : null}
      {result && result.items.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {result.total} public repositories
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Page {result.page}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {result.items.map((item) => (
              <ResultCard item={item} query={query} key={item.id} />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              disabled={result.page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={!result.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ResultCard({ item, query }: { item: SearchResult; query: string }) {
  return (
    <Link href={`/p/${item.slug}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:border-black dark:hover:border-white">
        <div className="flex flex-wrap gap-2">
          <Badge>{item.visibility.toLowerCase()}</Badge>
          {item.category ? <Badge>{item.category.name}</Badge> : null}
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
          {highlight(item.title, query)}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {highlight(
            item.description || 'A reusable prompt repository.',
            query,
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
          <span>by @{item.owner.username}</span>
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
    <div className="grid gap-4 md:grid-cols-2">
      <Skeleton className="h-64 rounded-[1.5rem]" />
      <Skeleton className="h-64 rounded-[1.5rem]" />
    </div>
  );
}
