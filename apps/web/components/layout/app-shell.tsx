import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteHeader } from '@/components/layout/site-header';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#0D0D0D] dark:bg-[#0D0D0D] dark:text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(13,13,13,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(13,13,13,0.035)_1px,transparent_1px)] bg-[size:32px_32px] dark:bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)]" />
      <SiteHeader />
      <main className="py-10 sm:py-12">
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
}
