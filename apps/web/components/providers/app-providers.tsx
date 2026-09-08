'use client';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { SiteSettingsProvider } from './site-settings-provider';
import { AuthDialogProvider } from './auth-dialog-provider';
import { FeedbackProvider } from '@/components/ui/feedback-modal';
import { SubscriptionProvider } from './subscription-provider';
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SiteSettingsProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <FeedbackProvider>
              <AuthDialogProvider>{children}</AuthDialogProvider>
            </FeedbackProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}
