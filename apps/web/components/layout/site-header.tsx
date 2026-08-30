'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-900 dark:bg-black/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center gap-3 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold tracking-[0.28em] text-black transition hover:border-black dark:border-zinc-800 dark:text-white dark:hover:border-white"
            href="/"
          >
            <span className="inline-flex size-2 rounded-full bg-black dark:bg-white" />
            VROMPT
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex lg:items-center lg:gap-2"
          >
            {primaryRoutes.map((route) => (
              <Link
                className={cn(
                  'rounded-full px-4 py-2 text-sm transition',
                  pathname === route.href
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900',
                )}
                href={route.href}
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
                'rounded-full px-4 py-2 text-sm transition',
                pathname === route.href
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900',
              )}
              href={route.href}
              key={route.href}
            >
              {route.label}
            </Link>
          ))}
          <div className="mx-1 h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
          {isLoading ? (
            <span className="px-4 py-2 text-sm text-zinc-500">Loading...</span>
          ) : user ? (
            <>
              <span className="px-2 text-sm text-zinc-600 dark:text-zinc-400">
                @{user.username}
              </span>
              <Button onClick={() => void logout()} variant="ghost">
                Log out
              </Button>
              <Avatar name={user.username} />
            </>
          ) : (
            <>
              <Link className={getButtonClasses('ghost')} href="/login">
                Login
              </Link>
              <Link className={getButtonClasses('primary')} href="/register">
                Join Vrompt
              </Link>
              <Avatar name="Prompt Owner" />
            </>
          )}
        </div>
        <MobileNav />
      </div>
    </header>
  );
}
