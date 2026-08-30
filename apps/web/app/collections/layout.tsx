import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Your prompt collections',
  'Organize useful prompts into personal collections.',
);

export default function CollectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
