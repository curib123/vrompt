'use client';

import { useState } from 'react';
import Link from 'next/link';
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
        aria-label="Toggle navigation"
        onClick={() => setOpen((current) => !current)}
        variant="secondary"
      >
        Menu
      </Button>
      {open ? (
        <div className="absolute inset-x-4 top-20 z-30 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <nav aria-label="Mobile navigation" className="grid gap-2">
            {[...primaryRoutes, ...secondaryRoutes].map((route) => (
              <Link
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm transition',
                  pathname === route.href
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900',
                )}
                href={route.href}
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
