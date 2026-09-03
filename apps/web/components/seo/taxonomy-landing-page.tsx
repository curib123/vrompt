import Link from 'next/link';
import type { Route } from 'next';

import { JsonLd } from '@/components/seo/json-ld';
import { SearchView } from '@/components/search/search-view';
import type { SearchResponse } from '@/lib/api';
import { absoluteUrl, createBreadcrumbList } from '@/lib/seo';

export type TaxonomyLanding = {
  kind: 'category' | 'audience';
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  faqs: Array<{ question: string; answer: string }>;
  related: Array<{ name: string; href: string }>;
};

export function TaxonomyLandingPage({
  landing,
  result,
}: {
  landing: TaxonomyLanding;
  result: SearchResponse | null;
}) {
  const path = `/prompts/${landing.kind === 'category' ? 'category' : 'for'}/${landing.slug}`;

  return (
    <div className="grid gap-8">
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'Explore prompts', path: '/explore' },
          { name: landing.title },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: landing.title,
          description: landing.description,
          url: absoluteUrl(path),
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: result?.total ?? 0,
            itemListElement: (result?.items ?? []).map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.title,
              url: absoluteUrl(`/p/${item.slug}`),
            })),
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: landing.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }}
      />

      <header className="grid gap-4 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-mid">
          Vrompt prompt library
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          {landing.title}
        </h1>
        <p className="max-w-3xl text-base leading-8 text-brand-mid">
          {landing.description}
        </p>
      </header>

      <SearchView
        heading={`Explore ${landing.name.toLowerCase()} prompts`}
        initialAudience={landing.kind === 'audience' ? landing.slug : undefined}
        initialCategory={landing.kind === 'category' ? landing.slug : undefined}
        initialResult={result}
        intro={landing.intro}
      />

      <section className="grid gap-5" aria-labelledby="faq-title">
        <h2
          id="faq-title"
          className="text-3xl font-semibold tracking-[-0.05em]"
        >
          Frequently asked questions
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {landing.faqs.map((faq) => (
            <details
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
              key={faq.question}
            >
              <summary className="cursor-pointer font-semibold">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-7 text-brand-mid">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {landing.related.length > 0 ? (
        <nav
          aria-label="Related prompt pages"
          className="border-t border-zinc-200 pt-6 dark:border-zinc-800"
        >
          <p className="text-sm font-semibold">Keep exploring</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {landing.related.map((item) => (
              <Link
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-black dark:border-zinc-700 dark:hover:border-white"
                href={item.href as Route}
                key={item.href}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
