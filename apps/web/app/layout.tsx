import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppProviders } from '@/components/providers/app-providers';
import './globals.css';
import './workspace.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001'),
  title: { default: 'Vrompt — The right AI for every task.', template: '%s | Vrompt' },
  description: 'One account. One subscription. Multiple AI models. Start with Auto or select a model yourself.',
  icons: { icon: '/vrompt-mark.svg' },
};
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning><body><AppProviders>{children}</AppProviders></body></html>;
}
