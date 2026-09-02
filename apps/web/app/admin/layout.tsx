import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminShell } from '@/components/admin/admin-shell';
import { createPrivatePageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPrivatePageMetadata(
  'Administration',
  'Private Vrompt administration tools.',
);

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
