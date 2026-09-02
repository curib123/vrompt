import type { Metadata } from 'next';

import { ExploreView } from '@/components/explore/explore-view';
import { JsonLd } from '@/components/seo/json-ld';
import { fetchExploreData } from '@/lib/api';
import { getPublicPromptPath } from '@/lib/prompt-sharing';
import {
  absoluteUrl,
  createBreadcrumbList,
  createPageMetadata,
} from '@/lib/seo';

export const revalidate = 300;

export const metadata: Metadata = createPageMetadata({
  title: 'Explore AI Prompts That Work',
  description:
    'Browse useful AI prompts by goal, category, popularity, and real creator experience. Copy a strong starting point and make it your own.',
  path: '/explore',
});

export default async function ExplorePage() {
  const initialExplore = await fetchExploreData();
  const featured = initialExplore?.featured.slice(0, 10) ?? [];

  return (
    <>
      <JsonLd
        data={createBreadcrumbList([
          { name: 'Home', path: '/' },
          { name: 'Explore prompts' },
        ])}
      />
      {featured.length > 0 ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Featured AI prompts on Vrompt',
            url: absoluteUrl('/explore'),
            numberOfItems: featured.length,
            itemListElement: featured.map((prompt, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: prompt.title,
              url: absoluteUrl(getPublicPromptPath(prompt.id, prompt.slug)),
            })),
          }}
        />
      ) : null}
      <ExploreView initialExplore={initialExplore} />
    </>
  );
}
