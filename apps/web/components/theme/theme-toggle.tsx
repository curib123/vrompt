'use client';

import { Moon, Sun } from 'lucide-react';

import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-soft bg-[var(--brand-surface)] text-brand-mid shadow-sm transition hover:border-brand-teal hover:text-foreground"
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      {isDark ? (
        <Sun aria-hidden="true" size={20} strokeWidth={1.8} />
      ) : (
        <Moon aria-hidden="true" size={20} strokeWidth={1.8} />
      )}
    </button>
  );
}
