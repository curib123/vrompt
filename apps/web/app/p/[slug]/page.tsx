import { notFound, permanentRedirect } from 'next/navigation';

import { getPublicPromptPath } from '@/lib/prompt-sharing';
import { getPromptSeoData } from '@/lib/seo-data';

export default async function LegacyPromptPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const repository = await getPromptSeoData(slug);
  if (!repository) notFound();

  permanentRedirect(getPublicPromptPath(repository.id, repository.slug));
}
