'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/cn';

const sharedLinks = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/ai', label: 'AI studio' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/audiences', label: 'Audiences' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/audit', label: 'Audit log' },
  { href: '/admin/account', label: 'Security' },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const allowed = user && ['ADMIN', 'MODERATOR'].includes(user.role);

  useEffect(() => {
    if (!isLoading && !allowed) router.replace('/staff/login' as Route);
  }, [allowed, isLoading, router]);

  if (isLoading || !allowed)
    return (
      <div className="min-h-64 rounded-[2rem] border border-[#E6E6E6] p-8 text-sm text-brand-mid dark:border-[#292929]">
        Checking staff access…
      </div>
    );

  const links =
    user.role === 'ADMIN'
      ? [
          ...sharedLinks.slice(0, 2),
          { href: '/admin/users', label: 'Users & staff' },
          { href: '/admin/taxonomy', label: 'Categories & tags' },
          { href: '/admin/settings', label: 'Site settings' },
          { href: '/admin/system', label: 'System health' },
          ...sharedLinks.slice(2),
        ]
      : sharedLinks;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <aside className="min-w-0 rounded-[1.75rem] border border-[#E6E6E6] bg-white p-3 lg:sticky lg:top-28 dark:border-[#292929] dark:bg-[#151515]">
        <div className="px-3 pb-3 pt-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-brand-mid">
            Control panel
          </p>
          <p className="mt-1 truncate text-sm font-semibold">
            @{user.username}
          </p>
          <span className="mt-2 inline-flex rounded-full bg-[#E6E6E6] px-2 py-1 text-[0.6rem] font-semibold tracking-[0.14em] dark:bg-[#292929]">
            {user.role}
          </span>
        </div>
        <nav
          aria-label="Control panel"
          className="flex gap-1 overflow-x-auto pb-1 lg:grid lg:overflow-visible"
        >
          {links.map((link) => {
            const active =
              link.href === '/admin'
                ? pathname === link.href
                : pathname.startsWith(link.href);
            return (
              <Link
                className={cn(
                  'whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium text-brand-mid transition hover:bg-[#F0F0EE] hover:text-foreground dark:hover:bg-[#242424]',
                  active &&
                    'bg-[#0D0D0D] !text-white dark:bg-white dark:!text-black',
                )}
                href={link.href as Route}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
