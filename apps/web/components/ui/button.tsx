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
    'bg-[#0D0D0D] !text-white hover:bg-[#1A1A1A] focus-visible:outline-black dark:bg-white dark:!text-[#0D0D0D] dark:hover:bg-[#E6E6E6]',
  secondary:
    'border border-[#E6E6E6] bg-white !text-[#0D0D0D] hover:border-[#0D0D0D] hover:bg-[#E6E6E6] focus-visible:outline-black dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:!text-white dark:hover:border-white dark:hover:bg-[#0D0D0D]',
  ghost:
    'bg-transparent !text-[#0D0D0D] hover:bg-[#E6E6E6] focus-visible:outline-black dark:!text-white dark:hover:bg-[#1A1A1A]',
};

export function getButtonClasses(variant: ButtonVariant, className?: string) {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
