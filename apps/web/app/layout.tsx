import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { AppProviders } from '@/components/providers/app-providers';

import './globals.css';

const displayFont = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Vrompt',
  description: 'Share. Prompt. Evolve.',
  icons: { icon: '/vrompt-mark.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className={displayFont.variable} lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-[#0D0D0D] antialiased dark:bg-[#0D0D0D] dark:text-white">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
