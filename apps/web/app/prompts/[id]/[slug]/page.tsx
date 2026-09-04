import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

import { SharedPromptTracker } from '@/components/analytics/shared-prompt-tracker';
import { RepositoryDetail } from '@/components/prompts/repository-detail';
import { JsonLd } from '@/components/seo/json-ld';
import { getPublicPromptPath } from '@/lib/prompt-sharing';
import {
  absoluteUrl,
  createBreadcrumbList,
  createPageMetadata,
  truncateSeoText,
} from '@/lib/seo';
import { getPromptSeoDataById } from '@/lib/seo-data';

type PublicPromptPageProps = Readonly<{
  params: Promise<{ id: string; slug: string }>;
}>;

export async function generateMetadata({
  params,
}: PublicPromptPageProps): Promise<Metadata> {
  const { id } = await params;
  const repository = await getPromptSeoDataById(id);

  if (!repository) {
    return createPageMetadata({
      title: 'Prompt',
      description: 'Explore this reusable AI prompt on Vrompt.',
      path: '/explore',
      index: false,
    });
  }

  const publicPath = getPublicPromptPath(repository.id, repository.slug);
  const description = truncateSeoText(
    repository.description ||
      'Explore this reusable AI prompt and its latest published version on Vrompt.',
  );
  const indexable =
    repository.visibility === 'PUBLIC' && repository.status === 'ACTIVE';

  return createPageMetadata({
    absoluteTitle: true,
    title: `${repository.title} | Vrompt`,
    description,
    imagePath: `${publicPath}/opengraph-image`,
    path: publicPath,
    index: indexable,
    follow: indexable,
  });
}

export default async function PublicPromptPage({
  params,
}: PublicPromptPageProps) {
  const { id, slug } = await params;
  const repository = await getPromptSeoDataById(id);

  if (!repository) {
    return (
      <RepositoryDetail
        initialTab="prompt"
        publicPath={getPublicPromptPath(id, slug)}
        slug={slug}
      />
    );
  }

  const publicPath = getPublicPromptPath(repository.id, repository.slug);
  if (slug !== repository.slug) permanentRedirect(publicPath);

  const indexable =
    repository.visibility === 'PUBLIC' && repository.status === 'ACTIVE';

  return (
    <>
      <SharedPromptTracker promptId={repository.id} />
      {indexable ? (
        <>
          <JsonLd
            data={createBreadcrumbList([
              { name: 'Home', path: '/' },
              { name: 'Explore prompts', path: '/explore' },
              { name: repository.title },
            ])}
          />
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'CreativeWork',
              '@id': absoluteUrl(`${publicPath}#prompt`),
              name: repository.title,
              description:
                repository.description || 'A reusable AI prompt on Vrompt.',
              url: absoluteUrl(publicPath),
              dateCreated: repository.createdAt,
              dateModified: repository.updatedAt,
              isAccessibleForFree: true,
              author: {
                '@type': 'Person',
                name:
                  repository.owner.profile?.displayName ||
                  repository.owner.username,
                alternateName: `@${repository.owner.username}`,
                url: absoluteUrl(
                  `/u/${encodeURIComponent(repository.owner.username)}`,
                ),
              },
              genre: repository.category?.name,
              keywords: repository.promptTags.map(({ tag }) => tag.name),
            }}
          />
        </>
      ) : null}
      <RepositoryDetail
        initialRepository={repository}
        initialTab="prompt"
        publicPath={publicPath}
        slug={repository.slug}
      />
    </>
  );
}
