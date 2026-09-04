import { permanentRedirect } from 'next/navigation';

import { RepositoryDetail } from '@/components/prompts/repository-detail';
import { getPublicPromptPath } from '@/lib/prompt-sharing';
import { getPromptSeoData } from '@/lib/seo-data';

export default async function LegacyPromptPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const repository = await getPromptSeoData(slug);
  if (!repository) {
    return <RepositoryDetail initialTab="prompt" slug={slug} />;
  }

  permanentRedirect(getPublicPromptPath(repository.id, repository.slug));
}
