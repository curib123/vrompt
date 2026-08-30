import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Completing sign-in',
  'Complete your secure Vrompt sign-in.',
);

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
