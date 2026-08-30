import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Saved prompts',
  'Return to the prompts you saved for later.',
);

export default function SavedLayout({ children }: { children: ReactNode }) {
  return children;
}
