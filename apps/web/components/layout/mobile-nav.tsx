'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BrandLockup } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/cn';
import { primaryRoutes, publicPrimaryRoutes } from '@/lib/routes';

export function MobileNav() {
  const pathname = usePathname();
  const { isLoading, user } = useAuth();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) {
        return;
      }

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  const visibleRoutes = user ? primaryRoutes : publicPrimaryRoutes;

  return (
    <div className="lg:hidden">
      <Button
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label="Open navigation"
        aria-haspopup="dialog"
        className="size-11 shrink-0 rounded-2xl border-[#E6E6E6] bg-white px-0 shadow-[0_8px_24px_rgba(13,13,13,0.08)] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:shadow-none"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        variant="secondary"
      >
        <span className="sr-only">Open menu</span>
        <span aria-hidden="true" className="grid w-5 gap-1.5">
          <span className="h-0.5 w-full bg-current" />
          <span className="h-0.5 w-3.5 bg-current" />
          <span className="h-0.5 w-full bg-current" />
        </span>
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="drawer-backdrop absolute inset-0 w-full cursor-default bg-[#0D0D0D]/60 backdrop-blur-[2px]"
            onClick={closeDrawer}
            type="button"
          />
          <aside
            aria-label="Mobile navigation drawer"
            aria-modal="true"
            className="drawer-panel absolute left-0 top-0 flex h-dvh w-[min(90vw,25rem)] flex-col overflow-hidden rounded-r-[2rem] border-r border-[#E6E6E6] bg-white px-5 pb-6 pt-5 shadow-2xl dark:border-[#1A1A1A] dark:bg-[#0D0D0D]"
            id="mobile-navigation"
            ref={drawerRef}
            role="dialog"
          >
            <div className="border-b border-[#E6E6E6] pb-5 dark:border-[#1A1A1A]">
              <div className="flex items-center justify-between gap-4">
                <Link
                  aria-label="Vrompt home"
                  href={user ? '/search' : '/'}
                  onClick={closeDrawer}
                >
                  <BrandLockup compact />
                </Link>
                <Button
                  aria-label="Close navigation"
                  className="size-11 shrink-0 rounded-2xl px-0"
                  onClick={closeDrawer}
                  ref={closeButtonRef}
                  variant="ghost"
                >
                  <span aria-hidden="true" className="relative size-5">
                    <span className="absolute left-0 top-1/2 h-0.5 w-5 -rotate-45 bg-current" />
                    <span className="absolute left-0 top-1/2 h-0.5 w-5 rotate-45 bg-current" />
                  </span>
                </Button>
              </div>
              <p className="mt-5 max-w-[17rem] text-sm leading-6 text-[#4D4D4D] dark:text-zinc-400">
                Discover useful prompts, thoughtful creators, and ideas worth
                sharing.
              </p>
            </div>
            <nav
              aria-label="Mobile navigation"
              className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain py-5 pr-1"
            >
              <p className="px-3 pb-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#4D4D4D] dark:text-zinc-400">
                Explore Vrompt
              </p>
              {visibleRoutes.map((route) => (
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
              ))}
            </nav>
            <div className="grid shrink-0 gap-3 border-t border-[#E6E6E6] pt-4 dark:border-[#1A1A1A]">
              <div className="rounded-2xl bg-[#0D0D0D] px-4 py-4 text-white shadow-[0_14px_28px_rgba(13,13,13,0.18)] dark:border dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:shadow-none">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Vrompt community
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-200">
                  Share. Prompt. Evolve.
                </p>
              </div>
              {isLoading ? (
                <p className="px-2 text-sm text-zinc-500">
                  Checking your account...
                </p>
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
                  <span className="shrink-0 rounded-full bg-[#E6E6E6] px-3 py-1.5 text-xs text-[#4D4D4D] dark:bg-[#1A1A1A] dark:text-zinc-300">
                    Workspace
                  </span>
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
                    className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#0D0D0D] px-3 py-2 text-sm font-medium !text-white transition hover:bg-[#1A1A1A] dark:bg-white dark:!text-[#0D0D0D] dark:hover:bg-[#E6E6E6]"
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
