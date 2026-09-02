'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

import { BrandLockup } from '@/components/brand/brand-mark';
import { AccountMenu } from '@/components/layout/account-menu';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useAuth } from '@/components/providers/auth-provider';
import { getButtonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { primaryRoutes, publicPrimaryRoutes } from '@/lib/routes';

export function SiteHeader() {
  const pathname = usePathname();
  const { isLoading, user } = useAuth();
  const visiblePrimaryRoutes = user ? primaryRoutes : publicPrimaryRoutes;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E6E6E6]/90 bg-white/95 backdrop-blur dark:border-[#1A1A1A] dark:bg-[#0D0D0D]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
        <div className="hidden w-full items-center justify-between gap-4 lg:flex">
          <div className="flex items-center gap-3">
            <Link
              aria-label="Vrompt home"
              className="group inline-flex rounded-lg px-1 py-1 transition hover:bg-[#E6E6E6] dark:hover:bg-[#1A1A1A]"
              href="/"
            >
              <BrandLockup compact />
            </Link>
            <nav
              aria-label="Primary navigation"
              className="hidden lg:flex lg:items-center lg:gap-2"
            >
              {visiblePrimaryRoutes.map((route) => (
                <Link
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm transition',
                    pathname === route.href
                      ? 'bg-[#0D0D0D] !text-background dark:bg-white'
                      : 'text-brand-mid hover:bg-[#E6E6E6] dark:hover:bg-[#1A1A1A]',
                  )}
                  href={route.href as Route}
                  key={route.href}
                >
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                className={cn(
                  'rounded-lg px-4 py-2 text-sm transition',
                  pathname === '/notifications'
                    ? 'bg-[#0D0D0D] !text-background dark:bg-white'
                    : 'text-brand-mid hover:bg-[#E6E6E6] dark:hover:bg-[#1A1A1A]',
                )}
                href="/notifications"
              >
                Notifications
              </Link>
            ) : null}
            {isLoading ? (
              <span
                aria-label="Checking your account"
                className="h-10 w-28 animate-pulse rounded-full bg-[#E6E6E6] dark:bg-[#1A1A1A]"
                role="status"
              />
            ) : user ? (
              <AccountMenu />
            ) : (
              <>
                <Link className={getButtonClasses('ghost')} href="/login">
                  Sign in
                </Link>
                <Link
                  className={getButtonClasses('primary', 'whitespace-nowrap')}
                  href="/register"
                >
                  Become a creator
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex w-full items-center gap-2 lg:hidden">
          <MobileNav />
          <Link
            aria-label="Vrompt home"
            className="inline-flex min-w-0 rounded-lg px-1 py-1 transition hover:bg-[#E6E6E6] dark:hover:bg-[#1A1A1A]"
            href="/"
          >
            <BrandLockup compact />
          </Link>
          <div className="ml-auto flex min-w-0 items-center">
            {isLoading ? (
              <span
                aria-label="Checking your account"
                className="size-10 animate-pulse rounded-full bg-[#E6E6E6] dark:bg-[#1A1A1A]"
                role="status"
              />
            ) : user ? (
              <AccountMenu />
            ) : (
              <Link
                className={getButtonClasses(
                  'primary',
                  'min-h-10 whitespace-nowrap px-4 py-2',
                )}
                href="/register"
              >
                Become a creator
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
