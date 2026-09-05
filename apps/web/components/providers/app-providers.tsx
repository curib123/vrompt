'use client';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { SiteSettingsProvider } from './site-settings-provider';
import { AuthDialogProvider } from './auth-dialog-provider';
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SiteSettingsProvider>
        <AuthProvider>
          <AuthDialogProvider>{children}</AuthDialogProvider>
        </AuthProvider>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}
