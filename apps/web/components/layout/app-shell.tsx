import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteHeader } from '@/components/layout/site-header';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0D0D0D] dark:bg-[#0D0D0D] dark:text-white">
      <div className="brand-grid absolute inset-0 -z-10" />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-5 focus:py-3 focus:text-sm focus:text-white"
        href="#main-content"
      >
        Skip to main content
      </a>
      <SiteHeader />
      <main className="py-6 sm:py-12" id="main-content">
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
}
