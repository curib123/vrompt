import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { AppProviders } from '@/components/providers/app-providers';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl, getSiteUrl, siteConfig } from '@/lib/seo';

import './globals.css';

const displayFont = Inter({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: 'Vrompt — High-Quality AI Prompts',
    template: '%s | Vrompt',
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    'AI prompts',
    'prompt engineering',
    'prompt library',
    'ChatGPT prompts',
    'AI workflows',
    'community prompts',
  ],
  authors: [{ name: 'Vrompt', url: '/' }],
  creator: 'Vrompt',
  publisher: 'Vrompt',
  category: 'technology',
  formatDetection: { address: false, email: false, telephone: false },
  icons: { icon: '/vrompt-mark.svg' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: siteConfig.name,
    title: 'Vrompt — High-Quality AI Prompts',
    description: siteConfig.description,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vrompt — High-Quality AI Prompts',
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html className={displayFont.variable} lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-[#0D0D0D] antialiased dark:bg-[#0D0D0D] dark:text-white">
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': absoluteUrl('/#organization'),
              name: siteConfig.name,
              url: absoluteUrl('/'),
              logo: absoluteUrl('/vrompt-mark.svg'),
              description: siteConfig.shortDescription,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              '@id': absoluteUrl('/#website'),
              name: siteConfig.name,
              url: absoluteUrl('/'),
              description: siteConfig.description,
              publisher: { '@id': absoluteUrl('/#organization') },
              potentialAction: {
                '@type': 'SearchAction',
                target: `${absoluteUrl('/search')}?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            },
          ]}
        />
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
