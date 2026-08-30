import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { AppProviders } from '@/components/providers/app-providers';

import './globals.css';

const displayFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Vrompt',
  description: 'The repository for AI prompts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      className={`${displayFont.variable} ${monoFont.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-black antialiased dark:bg-black dark:text-white">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
