'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

import { BrandLockup } from '@/components/brand/brand-mark';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button, getButtonClasses } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { primaryRoutes, secondaryRoutes } from '@/lib/routes';

export function SiteHeader() {
  const pathname = usePathname();
  const { isLoading, logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[#E6E6E6]/90 bg-white/95 backdrop-blur dark:border-[#1A1A1A] dark:bg-[#0D0D0D]/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
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
            {primaryRoutes.map((route) => (
              <Link
                className={cn(
                  'rounded-lg px-4 py-2 text-sm transition',
                  pathname === route.href
                    ? 'bg-[#0D0D0D] !text-white dark:bg-white dark:!text-[#0D0D0D]'
                    : 'text-[#4D4D4D] hover:bg-[#E6E6E6] dark:text-zinc-300 dark:hover:bg-[#1A1A1A]',
                )}
                href={route.href as Route}
                key={route.href}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {secondaryRoutes.slice(0, 2).map((route) => (
            <Link
              className={cn(
                'rounded-lg px-4 py-2 text-sm transition',
                pathname === route.href
                  ? 'bg-[#0D0D0D] !text-white dark:bg-white dark:!text-[#0D0D0D]'
                  : 'text-[#4D4D4D] hover:bg-[#E6E6E6] dark:text-zinc-300 dark:hover:bg-[#1A1A1A]',
              )}
              href={route.href as Route}
              key={route.href}
            >
              {route.label}
            </Link>
          ))}
          <div className="mx-1 h-6 w-px bg-[#E6E6E6] dark:bg-[#1A1A1A]" />
          {isLoading ? (
            <span className="px-4 py-2 text-sm text-zinc-500">Loading...</span>
          ) : user ? (
            <>
              <Link
                className="rounded-lg px-2 text-sm text-[#4D4D4D] hover:text-[#0D0D0D] dark:text-zinc-300 dark:hover:text-white"
                href={`/u/${user.username}`}
              >
                @{user.username}
              </Link>
              <Button onClick={() => void logout()} variant="ghost">
                Log out
              </Button>
              <Avatar
                className="border-[#0D0D0D] bg-[#E6E6E6]"
                name={user.username}
              />
            </>
          ) : (
            <>
              <Link className={getButtonClasses('ghost')} href="/login">
                Login
              </Link>
              <Link className={getButtonClasses('primary')} href="/register">
                Join Vrompt
              </Link>
            </>
          )}
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
