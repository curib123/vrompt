import type { Metadata } from 'next';

import { ExploreView } from '@/components/explore/explore-view';
import { fetchExploreData } from '@/lib/api';
import { createPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = createPageMetadata({
  title: 'Explore AI Prompts That Work',
  description:
    'Browse useful AI prompts by goal, category, popularity, and real creator experience. Copy a strong starting point and make it your own.',
  path: '/explore',
});

export default async function ExplorePage() {
  const initialExplore = await fetchExploreData();
  return <ExploreView initialExplore={initialExplore} />;
}
