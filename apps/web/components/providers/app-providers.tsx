'use client';

import type { ReactNode } from 'react';

import { PromptPreviewProvider } from '@/components/prompts/prompt-preview';
import { AuthModalProvider } from '@/components/auth/auth-modal';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from './auth-provider';
import { PublicSettingsProvider } from './public-settings-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PublicSettingsProvider>
        <AuthProvider>
          <AuthModalProvider>
            <ToastProvider>
              <PromptPreviewProvider>{children}</PromptPreviewProvider>
            </ToastProvider>
          </AuthModalProvider>
        </AuthProvider>
      </PublicSettingsProvider>
    </ThemeProvider>
  );
}
