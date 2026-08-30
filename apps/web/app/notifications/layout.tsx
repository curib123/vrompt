import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Notifications',
  'See your latest Vrompt community updates.',
);

export default function NotificationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
