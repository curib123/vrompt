import { RepositoryDetail } from '@/components/prompts/repository-detail';

export default async function PromptPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  return <RepositoryDetail slug={slug} />;
}
