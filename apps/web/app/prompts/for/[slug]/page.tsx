import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TaxonomyLandingPage } from '@/components/seo/taxonomy-landing-page';
import {
  fetchAudience,
  fetchSearchData,
  fetchSeoLandingPages,
} from '@/lib/api';
import { audienceLanding } from '@/lib/seo-landing-content';
import { createPageMetadata } from '@/lib/seo';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

async function getPage(slug: string) {
  const [audience, index] = await Promise.all([
    fetchAudience(slug),
    fetchSeoLandingPages(),
  ]);
  const entry = index?.audiences.find((item) => item.slug === slug);
  if (
    !audience ||
    !entry ||
    entry.promptCount < (index?.minimumPromptCount ?? 3)
  )
    notFound();
  const result = await fetchSearchData(
    new URLSearchParams({ audience: slug, page: '1' }),
  );
  return {
    landing: audienceLanding(
      audience.name,
      audience.slug,
      audience.description,
    ),
    result,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { landing } = await getPage(slug);
  return createPageMetadata({
    title: landing.title,
    description: landing.description,
    path: `/prompts/for/${landing.slug}`,
  });
}

export default async function AudiencePromptPage({ params }: Props) {
  const { slug } = await params;
  const { landing, result } = await getPage(slug);
  return <TaxonomyLandingPage landing={landing} result={result} />;
}
