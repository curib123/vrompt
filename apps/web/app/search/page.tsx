import { SearchView } from '@/components/search/search-view';

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
  return (
    <SearchView
      initialAi={value('ai')}
      initialCategory={value('category')}
      initialQuery={value('q')}
      initialSort={value('sort')}
    />
  );
}
