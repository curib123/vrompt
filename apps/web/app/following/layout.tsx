import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Following',
  'See new prompts and updates from creators you follow.',
);

export default function FollowingLayout({ children }: { children: ReactNode }) {
  return children;
}
