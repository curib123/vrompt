import type { Metadata } from 'next';

import { RepositoryDetail } from '@/components/prompts/repository-detail';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, createPageMetadata } from '@/lib/seo';
import { getPromptSeoData } from '@/lib/seo-data';

type PromptPageProps = Readonly<{
  params: Promise<{ slug: string }>;
}>;

export async function generateMetadata({
  params,
}: PromptPageProps): Promise<Metadata> {
  const { slug } = await params;
  const repository = await getPromptSeoData(slug);
  const description =
    repository?.description ||
    'Explore this reusable AI prompt, its examples, and the experience behind it on Vrompt.';

  return createPageMetadata({
    title: repository ? `${repository.title} — AI Prompt` : 'Prompt unavailable',
    description,
    path: `/p/${encodeURIComponent(slug)}`,
    index:
      repository?.visibility === 'PUBLIC' && repository.status === 'ACTIVE',
  });
}

export default async function PromptPage({ params }: PromptPageProps) {
  const { slug } = await params;
  const repository = await getPromptSeoData(slug);
  const indexable =
    repository?.visibility === 'PUBLIC' && repository.status === 'ACTIVE';

  return (
    <>
      {repository && indexable ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            '@id': absoluteUrl(`/p/${encodeURIComponent(slug)}#prompt`),
            name: repository.title,
            description:
              repository.description || 'A reusable AI prompt on Vrompt.',
            url: absoluteUrl(`/p/${encodeURIComponent(slug)}`),
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
            interactionStatistic: [
              {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/LikeAction',
                userInteractionCount: repository.likeCount,
              },
              {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/ShareAction',
                userInteractionCount: repository.copyCount,
              },
            ],
          }}
        />
      ) : null}
      <RepositoryDetail initialRepository={repository} slug={slug} />
    </>
  );
}
