import Link from 'next/link';

import { BrandLockup } from '@/components/brand/brand-mark';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getButtonClasses } from '@/components/ui/button';
import { fetchApiHealth, fetchExploreData } from '@/lib/api';
import type { ExploreRepository, ExploreResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [apiHealth, explore] = await Promise.all([
    fetchApiHealth(),
    fetchExploreData(),
  ]);

  return (
    <div className="grid gap-8">
      <Card className="relative grid gap-10 overflow-hidden border-[#E6E6E6] p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-14">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border-[36px] border-[#E6E6E6] opacity-70" />
        <div className="relative space-y-8">
          <BrandLockup />
          <div className="space-y-5">
            <Badge>Prompt knowledge, made visible.</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl">
                Share the prompt.
                <br />
                Evolve the idea.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#4D4D4D] dark:text-zinc-400">
                Find useful instructions quickly, understand how they evolve,
                and share the prompt systems that move creative work forward.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className={getButtonClasses('primary')} href="/explore">
              Explore prompts
            </Link>
            <Link className={getButtonClasses('secondary')} href="/create">
              Create a prompt
            </Link>
          </div>
        </div>
        <Card className="relative flex flex-col justify-between gap-10 border-[#0D0D0D] bg-[#0D0D0D] text-white shadow-none dark:border-white dark:bg-white dark:text-[#0D0D0D]">
          <BrandLockup compact inverted />
          <div className="space-y-7">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-zinc-400 dark:text-[#4D4D4D]">
              At a glance
            </p>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 dark:text-[#4D4D4D]">
                Your experience
              </p>
              <p className="text-3xl font-semibold tracking-[-0.05em]">
                Ready.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-zinc-400 dark:text-[#4D4D4D]">
                Connected services
              </p>
              <p className="text-3xl font-semibold tracking-[-0.05em]">
                {apiHealth ? 'Ready' : 'Unavailable'}
              </p>
              <p className="text-sm leading-6 text-zinc-400 dark:text-[#4D4D4D]">
                {apiHealth
                  ? 'Everything is connected and ready to explore.'
                  : "We're getting things ready. Please try again in a moment."}
              </p>
            </div>
          </div>
        </Card>
      </Card>

      <HomeDiscovery explore={explore} />
    </div>
  );
}

function HomeDiscovery({ explore }: { explore: ExploreResponse | null }) {
  if (!explore) {
    return (
      <Card className="grid gap-4">
        <Badge>Prompt library</Badge>
        <h2 className="text-3xl font-semibold tracking-[-0.05em]">
          Your prompt library is getting ready.
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Explore and search will appear as soon as everything is ready.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-10">
      <HomeSection items={explore.featured} title="Featured prompts" />
      <div className="grid gap-10 lg:grid-cols-2">
        <HomeSection items={explore.popular} title="Popular prompts" />
        <HomeSection items={explore.recentlyUpdated} title="Recently updated" />
      </div>
      <section className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              Browse by intent
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
              Top categories
            </h2>
          </div>
          <Link
            className="text-sm font-semibold underline underline-offset-4"
            href="/explore"
          >
            Open Explore
          </Link>
        </div>
        <div className="flex flex-wrap gap-3">
          {explore.categories.slice(0, 10).map((category) => (
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                Start here
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                Starter collections
              </h2>
            </div>
            <Link
              className="text-sm font-semibold underline underline-offset-4"
              href="/collections"
            >
              View collections
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {explore.starterCollections.slice(0, 4).map((collection) => (
              <Link
                href={`/collections/${collection.owner.username}/${collection.slug}`}
                key={collection.id}
              >
                <Card className="h-full transition hover:-translate-y-0.5 hover:border-black dark:hover:border-white">
                  <Badge>{collection._count.items} prompts</Badge>
                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                    {collection.name}
                  </h3>
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

function HomeSection({
  items,
  title,
}: {
  items: ExploreRepository[];
  title: string;
}) {
  return (
    <section className="grid gap-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-[-0.05em]">{title}</h2>
        <Link
          className="text-sm font-semibold underline underline-offset-4"
          href="/explore"
        >
          More
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {items.slice(0, 4).map((item) => (
          <Link href={`/p/${item.slug}`} key={item.id}>
            <Card className="h-full transition hover:-translate-y-0.5 hover:border-black dark:hover:border-white">
              {item.category ? <Badge>{item.category.name}</Badge> : null}
              <h3 className="mt-4 text-xl font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {item.description || 'A reusable prompt.'}
              </p>
              <p className="mt-5 text-xs text-zinc-500">
                Shared {item.copyCount} times by @{item.owner.username}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
