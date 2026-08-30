import type { ReactNode } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteHeader } from '@/components/layout/site-header';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(229,231,235,0.8),_rgba(244,244,245,1))] text-black dark:bg-[radial-gradient(circle_at_top_left,_rgba(35,35,35,1),_rgba(10,10,10,1),_rgba(0,0,0,1))] dark:text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 dark:bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
      <SiteHeader />
      <main className="py-10 sm:py-12">
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
}
