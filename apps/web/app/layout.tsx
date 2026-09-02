import type { Metadata, Viewport } from 'next';
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
    default: siteConfig.defaultTitle,
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
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: '/',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: siteConfig.tagline,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: ['/opengraph-image'],
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

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { color: '#FFFFFF', media: '(prefers-color-scheme: light)' },
    { color: '#0D0D0D', media: '(prefers-color-scheme: dark)' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      className={displayFont.variable}
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white text-foreground antialiased dark:bg-[#0D0D0D]">
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const stored = window.localStorage.getItem('vrompt-theme');
    const dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
  } catch {}
})()`,
          }}
        />
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
