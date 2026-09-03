import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Vrompt Pro pricing',
  description:
    'Compare Vrompt Free and Pro plans for AI prompt discovery, generation, and reusable workflows.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Vrompt Pro pricing',
    description:
      'Choose the Vrompt plan that fits how often you discover, generate, and reuse AI prompts.',
    url: '/pricing',
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
