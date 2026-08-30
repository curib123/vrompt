import { cache } from 'react';

import { getApiBaseUrl } from '@/lib/api';
import type {
  CollectionDetail,
  ProfileResponse,
  PromptRepositoryDetail,
  SitemapResponse,
} from '@/lib/api';

async function fetchPublicData<T>(path: string, revalidate = 300) {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      headers: { accept: 'application/json' },
      next: { revalidate },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const getPromptSeoData = cache((slug: string) =>
  fetchPublicData<PromptRepositoryDetail>(
    `/prompt-repositories/${encodeURIComponent(slug)}`,
  ),
);

export const getProfileSeoData = cache((username: string) =>
  fetchPublicData<ProfileResponse>(`/profiles/${encodeURIComponent(username)}`),
);

export const getCollectionSeoData = cache((username: string, slug: string) =>
  fetchPublicData<CollectionDetail>(
    `/collections/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
  ),
);

export const getSitemapData = cache(() =>
  fetchPublicData<SitemapResponse>('/search/sitemap', 3600),
);
