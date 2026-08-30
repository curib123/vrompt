import Link from 'next/link';

import { BrandLockup } from '@/components/brand/brand-mark';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getButtonClasses } from '@/components/ui/button';
import { fetchExploreData } from '@/lib/api';
import type { ExploreRepository, ExploreResponse } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const explore = await fetchExploreData();

  return (
    <div className="grid gap-14 sm:gap-20">
      <section className="relative grid gap-6 overflow-hidden rounded-[1.75rem] border border-[#E6E6E6] bg-white/95 p-5 shadow-[0_18px_50px_rgba(13,13,13,0.06)] backdrop-blur sm:gap-10 sm:p-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:p-14">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full border-[36px] border-[#E6E6E6] opacity-70 sm:size-96" />
        <div className="relative grid content-center gap-8 sm:gap-10">
          <BrandLockup />
          <div className="grid gap-5">
            <Badge>Better prompts. Better starting points.</Badge>
            <div className="grid gap-4">
              <h1 className="max-w-4xl text-[clamp(2.8rem,13vw,6.5rem)] font-semibold leading-[0.94] tracking-[-0.075em]">
                Stop starting
                <br />
                from a blank chat.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#4D4D4D] dark:text-zinc-400 sm:text-lg sm:leading-8">
                Discover high-quality prompts shaped by prompt engineers,
                creators, and people who use AI every day. Save what works,
                learn from the experience behind it, and make it yours.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className={getButtonClasses('primary', 'w-full sm:w-auto')}
              href="/explore"
            >
              Explore the prompt library
            </Link>
            <Link
              className={getButtonClasses('secondary', 'w-full sm:w-auto')}
              href="/create"
            >
              Share your prompt
            </Link>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Popular prompt topics">
            {['Writing', 'Research', 'Planning', 'Images'].map((topic) => (
              <Link
                className="rounded-full border border-[#E6E6E6] px-3 py-2 text-xs font-medium text-[#4D4D4D] transition hover:border-[#0D0D0D] hover:text-[#0D0D0D] dark:border-[#4D4D4D] dark:text-zinc-300 dark:hover:border-white dark:hover:text-white"
                href={`/search?q=${encodeURIComponent(topic)}`}
                key={topic}
              >
                {topic}
              </Link>
            ))}
          </div>
        </div>
        <div className="relative grid content-between gap-10 rounded-[1.5rem] bg-[#0D0D0D] p-5 text-white sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <BrandLockup compact inverted />
            <span className="rounded-full border border-white/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Built from practice
            </span>
          </div>
          <div className="grid gap-8">
            <div className="grid gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-400">
                Why Vrompt
              </p>
              <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-[-0.06em] sm:text-4xl">
                Find the thinking behind the prompt.
              </h2>
              <p className="max-w-sm text-sm leading-7 text-zinc-300">
                Every useful prompt can carry examples, results, and the notes
                that help the next person use it well.
              </p>
            </div>
            <div className="grid gap-4 border-t border-white/15 pt-5">
              <HomeSignal number="01" text="Start with proven ideas" />
              <HomeSignal number="02" text="Learn from real use" />
              <HomeSignal number="03" text="Keep making it better" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        <div className="grid gap-3 sm:max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
            A better way to work with AI
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-[-0.06em] sm:text-5xl">
            Useful knowledge, ready when you need it.
          </h2>
          <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base">
            Vrompt is a living library of high-quality prompts and the lessons
            around them, made for sharing instead of starting over.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <BenefitCard
            number="01"
            text="Search by goal, topic, or workflow and find a strong starting point faster."
            title="Find your starting point"
          />
          <BenefitCard
            number="02"
            text="See examples, results, and notes from the people who shaped the prompt."
            title="Learn from experience"
          />
          <BenefitCard
            number="03"
            text="Save, adapt, and share improvements so good ideas keep getting better."
            title="Make it yours"
          />
        </div>
      </section>

      <HomeDiscovery explore={explore} />
    </div>
  );
}

function HomeSignal({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-xs text-zinc-500">{number}</span>
      <span className="text-sm font-medium text-zinc-100">{text}</span>
    </div>
  );
}

function BenefitCard({
  number,
  text,
  title,
}: {
  number: string;
  text: string;
  title: string;
}) {
  return (
    <Card className="grid content-start gap-5 rounded-[1.35rem] p-5 sm:p-6">
      <span className="font-mono text-xs text-zinc-500">{number}</span>
      <div className="grid gap-2">
        <h3 className="text-xl font-semibold tracking-[-0.04em]">{title}</h3>
        <p className="text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          {text}
        </p>
      </div>
    </Card>
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
    <div className="grid gap-14 sm:gap-20">
      <HomeSection items={explore.featured} title="Featured prompts" />
      <div className="grid gap-14 lg:grid-cols-2 lg:gap-10">
        <HomeSection items={explore.popular} title="Popular prompts" />
        <HomeSection items={explore.recentlyUpdated} title="Recently updated" />
      </div>
      <section className="grid gap-5">
        <div className="grid gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
            Browse by goal
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em]">
            Find a prompt for what you are doing.
          </h2>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {explore.categories.slice(0, 10).map((category) => (
            <Link
              className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm transition hover:border-black dark:border-zinc-700 dark:hover:border-white"
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
          <div className="grid gap-2">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
              Start here
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em]">
              Starter collections
            </h2>
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
          className="shrink-0 text-sm font-semibold underline underline-offset-4"
          href="/explore"
        >
          See all
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
