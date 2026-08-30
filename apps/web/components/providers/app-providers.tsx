'use client';

import type { ReactNode } from 'react';

import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from './auth-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
