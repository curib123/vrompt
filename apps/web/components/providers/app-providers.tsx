'use client';

import type { ReactNode } from 'react';

import { PromptPreviewProvider } from '@/components/prompts/prompt-preview';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from './auth-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <PromptPreviewProvider>{children}</PromptPreviewProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
