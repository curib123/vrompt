import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'My prompts',
  'Create, revisit, and manage your reusable prompts on Vrompt.',
);

export default function CreateLayout({ children }: { children: ReactNode }) {
  return children;
}
