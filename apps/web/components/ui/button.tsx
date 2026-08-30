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
    'bg-black text-white hover:bg-zinc-800 focus-visible:outline-black dark:bg-white dark:text-black dark:hover:bg-zinc-200',
  secondary:
    'border border-zinc-300 bg-white text-black hover:border-black hover:bg-zinc-100 focus-visible:outline-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:hover:border-white dark:hover:bg-zinc-900',
  ghost:
    'bg-transparent text-black hover:bg-zinc-100 focus-visible:outline-black dark:text-white dark:hover:bg-zinc-900',
};

export function getButtonClasses(variant: ButtonVariant, className?: string) {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
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
});
