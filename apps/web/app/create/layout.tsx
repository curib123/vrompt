import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Create a prompt',
  'Create and publish a reusable prompt on Vrompt.',
);

export default function CreateLayout({ children }: { children: ReactNode }) {
  return children;
}
