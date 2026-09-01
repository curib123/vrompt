import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Become a creator',
  'Become a Vrompt creator with Google or GitHub and start building your prompt collection.',
);

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
