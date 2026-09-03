import type { Metadata } from 'next';

import { GeneratorView } from '@/components/generate/generator-view';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'AI Prompt Generator',
  description:
    'Describe your goal and generate a structured, editable AI prompt you can copy and use.',
  path: '/generate',
});

export default function GeneratePage() {
  return <GeneratorView />;
}
