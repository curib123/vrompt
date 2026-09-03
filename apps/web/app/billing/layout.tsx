import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Billing and usage',
  description: 'Review your Vrompt plan, AI usage, and payment status.',
  robots: { index: false, follow: true },
};

export default function BillingLayout({ children }: { children: ReactNode }) {
  return children;
}
