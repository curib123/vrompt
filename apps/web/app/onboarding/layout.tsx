import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Choose your interests',
  'Set up your private Vrompt discovery preferences.',
);

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
