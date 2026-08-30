'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { primaryRoutes, secondaryRoutes } from '@/lib/routes';

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label="Toggle navigation"
        onClick={() => setOpen((current) => !current)}
        variant="secondary"
      >
        Menu
      </Button>
      {open ? (
        <div
          className="absolute inset-x-4 top-20 z-30 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          id="mobile-navigation"
        >
          <nav aria-label="Mobile navigation" className="grid gap-2">
            {[...primaryRoutes, ...secondaryRoutes].map((route) => (
              <Link
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm transition',
                  pathname === route.href
                    ? 'bg-[#0D0D0D] !text-white dark:bg-white dark:!text-[#0D0D0D]'
                    : '!text-[#4D4D4D] hover:bg-[#E6E6E6] dark:!text-zinc-300 dark:hover:bg-[#1A1A1A]',
                )}
                href={route.href as Route}
                key={route.href}
                onClick={() => setOpen(false)}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
