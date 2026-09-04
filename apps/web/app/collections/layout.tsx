import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Your prompt projects',
  'Organize useful prompts into personal projects.',
);

export default function CollectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
