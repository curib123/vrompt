import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Account settings',
  'Manage your Vrompt profile and account.',
);

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
