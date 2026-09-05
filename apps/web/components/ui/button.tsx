import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-azure to-brand-teal !text-white shadow-[0_10px_24px_rgba(59,130,246,0.2)] hover:brightness-105 focus-visible:outline-brand-azure',
  secondary:
    'border border-brand-soft bg-[var(--brand-surface)] !text-foreground hover:border-brand-teal hover:bg-brand-paper focus-visible:outline-brand-azure',
  ghost:
    'bg-transparent !text-foreground hover:bg-brand-soft focus-visible:outline-brand-azure',
};

export function getButtonClasses(variant: ButtonVariant, className?: string) {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { children, className, type = 'button', variant = 'primary', ...props },
    ref,
  ) {
    return (
      <button
        className={getButtonClasses(variant, className)}
        ref={ref}
        type={type}
        {...props}
      >
        {children}
      </button>
    );
  },
);
