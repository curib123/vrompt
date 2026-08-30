import type { Metadata } from 'next';

import { SearchView } from '@/components/search/search-view';
import { fetchSearchData } from '@/lib/api';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Search AI Prompts',
  description:
    'Search the Vrompt prompt library by topic, category, AI compatibility, and community activity.',
  path: '/search',
  index: false,
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => {
    const item = params[key];
    return Array.isArray(item) ? item[0] : item;
  };
  const initialQuery = value('q');
  const initialCategory = value('category');
  const initialAi = value('aiCompatibility') ?? value('ai');
  const initialSort = value('sort');
  const requestedPage = Number(value('page'));
  const initialPage = Number.isFinite(requestedPage)
    ? Math.max(requestedPage, 1)
    : 1;
  const apiParams = new URLSearchParams();
  if (initialQuery) apiParams.set('q', initialQuery);
  if (initialCategory) apiParams.set('category', initialCategory);
  if (initialAi) apiParams.set('aiCompatibility', initialAi);
  if (initialSort) apiParams.set('sort', initialSort);
  apiParams.set('page', String(initialPage));
  const initialResult = await fetchSearchData(apiParams);

  return (
    <SearchView
      initialAi={initialAi}
      initialCategory={initialCategory}
      initialPage={initialPage}
      initialQuery={initialQuery}
      initialResult={initialResult}
      initialSort={initialSort}
    />
  );
}
