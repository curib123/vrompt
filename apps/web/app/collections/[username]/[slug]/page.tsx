import type { Metadata } from 'next';

import { CollectionDetailView } from '@/components/collections/collection-detail';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import { getCollectionSeoData } from '@/lib/seo-data';

type CollectionPageProps = Readonly<{
  params: Promise<{ username: string; slug: string }>;
}>;

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug, username } = await params;
  const collection = await getCollectionSeoData(username, slug);

  return createPageMetadata({
    title: collection ? `${collection.name} — Prompt Collection` : 'Collection unavailable',
    description:
      collection?.description ||
      `Explore a curated collection of reusable AI prompts by @${username} on Vrompt.`,
    path: `/collections/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    index: collection?.visibility === 'PUBLIC',
  });
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug, username } = await params;
  const collection = await getCollectionSeoData(username, slug);
  const indexable = collection?.visibility === 'PUBLIC';

  return (
    <>
      {collection && indexable ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': absoluteUrl(
              `/collections/${encodeURIComponent(username)}/${encodeURIComponent(slug)}#collection`,
            ),
            name: collection.name,
            description:
              collection.description || 'A curated AI prompt collection.',
            url: absoluteUrl(
              `/collections/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
            ),
            dateCreated: collection.createdAt,
            dateModified: collection.updatedAt,
            author: {
              '@type': 'Person',
              name: collection.owner.username,
              url: absoluteUrl(
                `/u/${encodeURIComponent(collection.owner.username)}`,
              ),
            },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: collection.items.length,
              itemListElement: collection.items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.promptRepository.title,
                url: absoluteUrl(
                  `/p/${encodeURIComponent(item.promptRepository.slug)}`,
                ),
              })),
            },
          }}
        />
      ) : null}
      <CollectionDetailView
        initialCollection={collection}
        slug={slug}
        username={username}
      />
    </>
  );
}
