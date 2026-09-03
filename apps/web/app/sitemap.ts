import type { MetadataRoute } from 'next';

import { getSitemapData } from '@/lib/seo-data';
import { absoluteUrl } from '@/lib/seo';
import { getPublicPromptPath } from '@/lib/prompt-sharing';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData();
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
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
    ...(data.landingPages?.categories ?? [])
      .filter(
        (category) =>
          category.promptCount >= (data.landingPages?.minimumPromptCount ?? 3),
      )
      .map((category) => ({
        url: absoluteUrl(`/prompts/category/${category.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ...(data.landingPages?.audiences ?? [])
      .filter(
        (audience) =>
          audience.promptCount >= (data.landingPages?.minimumPromptCount ?? 3),
      )
      .map((audience) => ({
        url: absoluteUrl(`/prompts/for/${audience.slug}`),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
    ...data.prompts.map((prompt) => ({
      url: absoluteUrl(getPublicPromptPath(prompt.id, prompt.slug)),
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
