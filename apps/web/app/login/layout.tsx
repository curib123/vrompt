import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Sign in',
  'Sign in to Vrompt with Google or GitHub to save, follow, and share prompts.',
);

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
