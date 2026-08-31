import type { MetadataRoute } from 'next';

import { getSitemapData } from '@/lib/seo-data';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/landing'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/explore'),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  if (!data) return staticEntries;

  return [
    ...staticEntries,
    ...data.prompts.map((prompt) => ({
      url: absoluteUrl(`/p/${encodeURIComponent(prompt.slug)}`),
      lastModified: prompt.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...data.profiles.map((profile) => ({
      url: absoluteUrl(`/u/${encodeURIComponent(profile.username)}`),
      lastModified: profile.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...data.collections.map((collection) => ({
      url: absoluteUrl(
        `/collections/${encodeURIComponent(collection.owner.username)}/${encodeURIComponent(collection.slug)}`,
      ),
      lastModified: collection.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
