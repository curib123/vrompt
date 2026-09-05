'use client';
import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';
export function AppProviders({ children }: { children: ReactNode }) { return <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>; }
