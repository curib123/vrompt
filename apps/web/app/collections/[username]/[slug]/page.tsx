import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CollectionDetailView } from '@/components/collections/collection-detail';
import { JsonLd } from '@/components/seo/json-ld';
import {
  absoluteUrl,
  createBreadcrumbList,
  createPageMetadata,
} from '@/lib/seo';
import { getCollectionSeoData } from '@/lib/seo-data';
import { getPublicPromptPath } from '@/lib/prompt-sharing';

type CollectionPageProps = Readonly<{
  params: Promise<{ username: string; slug: string }>;
}>;

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { slug, username } = await params;
  const collection = await getCollectionSeoData(username, slug);
  if (!collection) {
    notFound();
  }
  const publicPath = `/collections/${encodeURIComponent(collection.owner.username)}/${encodeURIComponent(collection.slug)}`;

  return createPageMetadata({
    title: collection
      ? `${collection.name} — Prompt Collection`
      : 'Collection unavailable',
    description:
      collection?.description ||
      `Explore a curated collection of reusable AI prompts by @${username} on Vrompt.`,
    path: publicPath,
    index: collection.visibility === 'PUBLIC' && collection.items.length > 0,
  });
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug, username } = await params;
  const collection = await getCollectionSeoData(username, slug);
  if (!collection) {
    notFound();
  }
  const publicPath = collection
    ? `/collections/${encodeURIComponent(collection.owner.username)}/${encodeURIComponent(collection.slug)}`
    : `/collections/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  const indexable =
    collection?.visibility === 'PUBLIC' && collection.items.length > 0;

  return (
    <>
      {collection && indexable ? (
        <>
          <JsonLd
            data={createBreadcrumbList([
              { name: 'Home', path: '/' },
              { name: 'Explore prompts', path: '/explore' },
              { name: collection.name },
            ])}
          />
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              '@id': absoluteUrl(`${publicPath}#collection`),
              name: collection.name,
              description:
                collection.description || 'A curated AI prompt collection.',
              url: absoluteUrl(publicPath),
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
                    getPublicPromptPath(
                      item.promptRepository.id,
                      item.promptRepository.slug,
                    ),
                  ),
                })),
              },
            }}
          />
        </>
      ) : null}
      <CollectionDetailView
        initialCollection={collection}
        slug={slug}
        username={username}
      />
    </>
  );
}
