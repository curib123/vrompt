'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BrandLockup } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { primaryRoutes, secondaryRoutes } from '@/lib/routes';

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstLinkRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="lg:hidden">
      <Button
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation"
        className="size-11 px-0"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        variant="secondary"
      >
        <span className="sr-only">Menu</span>
        <span aria-hidden="true" className="grid w-5 gap-1">
          <span className="h-0.5 w-full bg-current" />
          <span className="h-0.5 w-full bg-current" />
          <span className="h-0.5 w-full bg-current" />
        </span>
      </Button>
      {open ? (
        <div
          aria-label="Mobile navigation drawer"
          className="fixed inset-0 z-50 lg:hidden"
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
        >
          <button
            aria-label="Close navigation"
            className="drawer-backdrop absolute inset-0 w-full cursor-default bg-[#0D0D0D]/60"
            onClick={closeDrawer}
            type="button"
          />
          <aside className="drawer-panel absolute right-0 top-0 flex h-full w-[min(88vw,24rem)] flex-col border-l border-[#E6E6E6] bg-white px-5 pb-6 pt-5 shadow-2xl dark:border-[#1A1A1A] dark:bg-[#0D0D0D]">
            <div className="flex items-center justify-between gap-4 border-b border-[#E6E6E6] pb-5 dark:border-[#1A1A1A]">
              <Link aria-label="Vrompt home" href="/" onClick={closeDrawer}>
                <BrandLockup compact />
              </Link>
              <Button
                aria-label="Close navigation"
                className="size-11 px-0"
                onClick={closeDrawer}
                variant="ghost"
              >
                <span aria-hidden="true" className="relative size-5">
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -rotate-45 bg-current" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 rotate-45 bg-current" />
                </span>
              </Button>
            </div>
            <nav
              aria-label="Mobile navigation"
              className="grid gap-2 overflow-y-auto py-6"
            >
              <p className="px-4 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#4D4D4D] dark:text-zinc-400">
                Navigate
              </p>
              {[...primaryRoutes, ...secondaryRoutes].map((route, index) => (
                <Link
                  className={cn(
                    'rounded-xl px-4 py-3.5 text-base font-medium transition',
                    pathname === route.href
                      ? 'bg-[#0D0D0D] !text-white dark:bg-white dark:!text-[#0D0D0D]'
                      : '!text-[#4D4D4D] hover:bg-[#E6E6E6] dark:!text-zinc-300 dark:hover:bg-[#1A1A1A]',
                  )}
                  href={route.href as Route}
                  key={route.href}
                  onClick={closeDrawer}
                  ref={index === 0 ? firstLinkRef : undefined}
                >
                  {route.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto border-t border-[#E6E6E6] pt-5 text-xs uppercase tracking-[0.2em] text-[#4D4D4D] dark:border-[#1A1A1A] dark:text-zinc-400">
              Share. Prompt. Evolve.
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
