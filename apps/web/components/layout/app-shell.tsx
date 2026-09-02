import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteAnnouncement } from '@/components/providers/public-settings-provider';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-[#0D0D0D]">
      <div className="brand-grid absolute inset-0 -z-10" />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-5 focus:py-3 focus:text-sm focus:text-white"
        href="#main-content"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <SiteAnnouncement />
      <main className="page-reveal py-6 sm:py-12" id="main-content">
        <PageContainer>{children}</PageContainer>
      </main>
      <SiteFooter />
    </div>
  );
}
