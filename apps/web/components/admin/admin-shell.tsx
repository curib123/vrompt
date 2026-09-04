'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

type AdminLink = { href: string; label: string; icon: string };
type AdminGroup = { label: string; adminOnly?: boolean; links: AdminLink[] };

const groups: AdminGroup[] = [
  {
    label: 'Workspace',
    links: [
      { href: '/admin', label: 'Overview', icon: '⌂' },
      { href: '/admin/analytics', label: 'Analytics', icon: '↗' },
    ],
  },
  {
    label: 'Content',
    links: [
      { href: '/admin/ai', label: 'AI studio', icon: '✦' },
      { href: '/admin/moderation', label: 'Moderation', icon: '◇' },
      { href: '/admin/audiences', label: 'Audiences', icon: '◎' },
      { href: '/admin/taxonomy', label: 'Categories & tags', icon: '#' },
    ],
  },
  {
    label: 'Business',
    links: [{ href: '/admin/billing', label: 'Billing', icon: '$' }],
  },
  {
    label: 'Administration',
    adminOnly: true,
    links: [
      { href: '/admin/users', label: 'Users & staff', icon: '◉' },
      { href: '/admin/settings', label: 'Site settings', icon: '⚙' },
      { href: '/admin/system', label: 'System health', icon: '○' },
    ],
  },
  {
    label: 'Accountability',
    links: [
      { href: '/admin/audit', label: 'Audit log', icon: '≡' },
      { href: '/admin/account', label: 'Security', icon: '⌁' },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const visibleGroups = groups.filter(
    (group) => !group.adminOnly || user.role === 'ADMIN',
  );
  const currentLink = visibleGroups
    .flatMap((group) => group.links)
    .find((link) =>
      link.href === '/admin'
        ? pathname === link.href
        : pathname.startsWith(link.href),
    );

  const navigation = (
    <>
      <div className="border-b border-[#E6E6E6] px-4 pb-4 pt-2 dark:border-[#292929]">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-brand-mid">
          Control panel
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold">@{user.username}</p>
          <span className="rounded-full bg-[#EDEDEB] px-2 py-1 text-[0.6rem] font-semibold tracking-[0.12em] dark:bg-[#292929]">
            {user.role}
          </span>
        </div>
      </div>
      <nav aria-label="Control panel" className="grid gap-5 p-3">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-brand-mid">
              {group.label}
            </p>
            <div className="grid gap-0.5">
              {group.links.map((link) => {
                const active =
                  link.href === '/admin'
                    ? pathname === link.href
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-brand-mid transition hover:bg-[#F0F0EE] hover:text-foreground dark:hover:bg-[#242424]',
                      active &&
                        'bg-[#0D0D0D] !text-white shadow-sm dark:bg-white dark:!text-black',
                    )}
                    href={link.href as Route}
                    key={link.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span
                      aria-hidden="true"
                      className="w-4 text-center text-xs"
                    >
                      {link.icon}
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-w-0">
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#E6E6E6] bg-white px-3 py-2 lg:hidden dark:border-[#292929] dark:bg-[#151515]">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.15em] text-brand-mid">
            Control panel
          </p>
          <p className="text-sm font-semibold">
            {currentLink?.label ?? 'Administration'}
          </p>
        </div>
        <Button
          aria-expanded={mobileOpen}
          aria-label="Open control panel navigation"
          className="px-4"
          onClick={() => setMobileOpen(true)}
          variant="secondary"
        >
          Menu
        </Button>
      </div>
      {mobileOpen ? (
        <div className="drawer-backdrop fixed inset-0 z-50 bg-black/50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="drawer-panel relative h-full w-[min(21rem,88vw)] overflow-y-auto bg-white shadow-2xl dark:bg-[#151515]">
            <div className="flex justify-end px-3">
              <Button
                className="px-4"
                onClick={() => setMobileOpen(false)}
                variant="ghost"
              >
                Close
              </Button>
            </div>
            {navigation}
          </aside>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <aside className="hidden max-h-[calc(100dvh-8rem)] min-w-0 overflow-y-auto rounded-[1.5rem] border border-[#E6E6E6] bg-white lg:sticky lg:top-28 lg:block dark:border-[#292929] dark:bg-[#151515]">
          {navigation}
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
