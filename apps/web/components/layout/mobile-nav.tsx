'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BrandLockup } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/cn';
import { primaryRoutes, secondaryRoutes } from '@/lib/routes';

export function MobileNav() {
  const pathname = usePathname();
  const { isLoading, logout, user } = useAuth();
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
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-haspopup="dialog"
        className="size-11 rounded-2xl border-[#E6E6E6] bg-white px-0 shadow-[0_8px_24px_rgba(13,13,13,0.08)] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:shadow-none"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        variant="secondary"
      >
        <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
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
            className="drawer-backdrop absolute inset-0 w-full cursor-default bg-[#0D0D0D]/60 backdrop-blur-[2px]"
            onClick={closeDrawer}
            type="button"
          />
          <aside className="drawer-panel absolute right-0 top-0 flex h-full w-[min(90vw,25rem)] flex-col rounded-l-[2rem] border-l border-[#E6E6E6] bg-white px-5 pb-6 pt-5 shadow-2xl dark:border-[#1A1A1A] dark:bg-[#0D0D0D]">
            <div className="border-b border-[#E6E6E6] pb-5 dark:border-[#1A1A1A]">
              <div className="flex items-center justify-between gap-4">
                <Link aria-label="Vrompt home" href="/" onClick={closeDrawer}>
                  <BrandLockup compact />
                </Link>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#E6E6E6] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#4D4D4D] dark:bg-[#1A1A1A] dark:text-zinc-300">
                    Menu
                  </span>
                  <Button
                    aria-label="Close navigation"
                    className="size-11 rounded-2xl px-0"
                    onClick={closeDrawer}
                    variant="ghost"
                  >
                    <span aria-hidden="true" className="relative size-5">
                      <span className="absolute left-0 top-1/2 h-0.5 w-5 -rotate-45 bg-current" />
                      <span className="absolute left-0 top-1/2 h-0.5 w-5 rotate-45 bg-current" />
                    </span>
                  </Button>
                </div>
              </div>
              <p className="mt-5 max-w-[17rem] text-sm leading-6 text-[#4D4D4D] dark:text-zinc-400">
                Discover useful prompts, thoughtful creators, and ideas worth
                sharing.
              </p>
            </div>
            <nav
              aria-label="Mobile navigation"
              className="grid min-h-0 gap-1 overflow-y-auto py-6"
            >
              <p className="px-3 pb-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#4D4D4D] dark:text-zinc-400">
                Explore Vrompt
              </p>
              {[...primaryRoutes, ...secondaryRoutes.slice(0, 2)].map(
                (route, index) => (
                <Link
                  className={cn(
                    'group flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-medium transition',
                    pathname === route.href
                      ? 'bg-[#0D0D0D] !text-white shadow-[0_10px_24px_rgba(13,13,13,0.16)] dark:bg-white dark:!text-[#0D0D0D] dark:shadow-none'
                      : '!text-[#4D4D4D] hover:bg-[#E6E6E6] dark:!text-zinc-300 dark:hover:bg-[#1A1A1A]',
                  )}
                  href={route.href as Route}
                  key={route.href}
                  onClick={closeDrawer}
                  ref={index === 0 ? firstLinkRef : undefined}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 rounded-full border border-current transition',
                      pathname === route.href
                        ? 'bg-current'
                        : 'group-hover:bg-current',
                    )}
                  />
                  {route.label}
                </Link>
                ),
              )}
            </nav>
            <div className="mt-auto grid gap-3">
              <div className="rounded-2xl bg-[#0D0D0D] px-4 py-4 text-white shadow-[0_14px_28px_rgba(13,13,13,0.18)] dark:border dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:shadow-none">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Vrompt community
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-200">
                  Share. Prompt. Evolve.
                </p>
              </div>
              {isLoading ? (
                <p className="px-2 text-sm text-zinc-500">Checking your account...</p>
              ) : user ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E6E6E6] px-3 py-2 dark:border-[#4D4D4D]">
                  <Link
                    className="min-w-0 rounded-xl px-2 py-2 text-sm font-medium text-[#4D4D4D] hover:bg-[#E6E6E6] dark:text-zinc-300 dark:hover:bg-[#1A1A1A]"
                    href={`/u/${user.username}`}
                    onClick={closeDrawer}
                  >
                    <span className="block truncate">Your profile</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      @{user.username}
                    </span>
                  </Link>
                  <Button
                    className="shrink-0 px-3 text-xs"
                    onClick={() => {
                      closeDrawer();
                      void logout();
                    }}
                    variant="ghost"
                  >
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E6E6E6] px-3 py-2 text-sm font-medium text-[#0D0D0D] transition hover:bg-[#E6E6E6] dark:border-[#4D4D4D] dark:text-white dark:hover:bg-[#1A1A1A]"
                    href="/login"
                    onClick={closeDrawer}
                  >
                    Login
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#0D0D0D] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#1A1A1A] dark:bg-white dark:text-[#0D0D0D] dark:hover:bg-[#E6E6E6]"
                    href="/register"
                    onClick={closeDrawer}
                  >
                    Join Vrompt
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
