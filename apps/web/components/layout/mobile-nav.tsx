'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest, getMediaUrl } from '@/lib/api';
import type { ProfileResponse } from '@/lib/api';
import { cn } from '@/lib/cn';
import { primaryRoutes, publicPrimaryRoutes } from '@/lib/routes';

export function MobileNav() {
  const pathname = usePathname();
  const { accessToken, isLoading, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const loadProfile = useEffectEvent(async () => {
    if (!accessToken) return;
    try {
      setProfile(
        await apiRequest<ProfileResponse>('/profiles/me', { accessToken }),
      );
    } catch {
      // Session details provide a stable identity fallback if profile media fails.
    }
  });

  useEffect(() => {
    // The initial request synchronizes drawer identity with the active session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
    const handleProfileUpdate = () => void loadProfile();
    window.addEventListener('vrompt:profile-updated', handleProfileUpdate);
    return () =>
      window.removeEventListener('vrompt:profile-updated', handleProfileUpdate);
  }, [accessToken]);

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
  const displayName = profile?.displayName || user?.username || 'Creator';
  const profileHref = user ? (`/u/${user.username}` as Route) : '/login';

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
            <div className="pb-4">
              <div className="flex items-center justify-between gap-4">
                <Link aria-label="Vrompt home" href="/" onClick={closeDrawer}>
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
            </div>
            {user ? (
              <Link
                aria-label={`View ${displayName}'s profile`}
                className="group relative isolate mb-2 overflow-hidden rounded-[1.75rem] bg-[#0D0D0D] p-4 !text-on-dark shadow-[0_20px_50px_rgba(13,13,13,0.24)] transition hover:-translate-y-0.5 dark:border dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:shadow-none"
                href={profileHref}
                onClick={closeDrawer}
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl transition group-hover:scale-125"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-16 left-10 size-32 rounded-full bg-white/5 blur-xl"
                />
                <span className="relative flex items-center gap-3.5">
                  <span className="relative shrink-0">
                    <Avatar
                      avatar={getMediaUrl(profile?.avatar ?? null)}
                      className="size-16 border-2 border-white/30 bg-white/10 !text-on-dark shadow-[0_10px_30px_rgba(0,0,0,0.28)]"
                      name={displayName}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-[#0D0D0D] bg-emerald-400 dark:border-[#1A1A1A]"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold tracking-tight">
                      {displayName}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-xs !text-on-dark-muted">
                      @{user.username}
                    </span>
                    <span className="mt-2 inline-flex rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] !text-on-dark-muted">
                      {formatCreatorTier(
                        profile?.accountType || user.accountType,
                      )}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid size-8 place-items-center rounded-full border border-white/15 bg-white/10 text-lg transition group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
                <span className="relative mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3">
                  <ProfileStat
                    label="Prompts"
                    value={profile?.stats.repositories}
                  />
                  <ProfileStat
                    label="Followers"
                    value={profile?.stats.followers}
                  />
                  <ProfileStat
                    label="Following"
                    value={profile?.stats.following}
                  />
                </span>
              </Link>
            ) : null}
            <nav
              aria-label="Mobile navigation"
              className="grid min-h-0 flex-1 content-start gap-1 overflow-y-auto overscroll-contain py-3 pr-1"
            >
              {visibleRoutes.map((route) => (
                <Link
                  className={cn(
                    'group flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition',
                    pathname === route.href
                      ? 'bg-[#0D0D0D] !text-background shadow-[0_10px_24px_rgba(13,13,13,0.16)] dark:bg-white dark:shadow-none'
                      : '!text-brand-mid hover:bg-[#E6E6E6] dark:hover:bg-[#1A1A1A]',
                  )}
                  href={route.href as Route}
                  key={route.href}
                  onClick={closeDrawer}
                >
                  <DrawerIcon name={route.icon} />
                  {route.label}
                </Link>
              ))}
              {user ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#E6E6E6] pt-4 dark:border-[#1A1A1A]">
                  <DrawerShortcut
                    href={`${profileHref}?tab=saved` as Route}
                    icon="saved"
                    label="Saved"
                    onSelect={closeDrawer}
                  />
                  <DrawerShortcut
                    href={`${profileHref}?tab=collections` as Route}
                    icon="collections"
                    label="Collections"
                    onSelect={closeDrawer}
                  />
                  <DrawerShortcut
                    href={`${profileHref}?tab=following` as Route}
                    icon="following"
                    label="Following"
                    onSelect={closeDrawer}
                  />
                  <DrawerShortcut
                    href="/notifications"
                    icon="notifications"
                    label="Notifications"
                    onSelect={closeDrawer}
                  />
                </div>
              ) : null}
            </nav>
            <div
              className={cn(
                'grid shrink-0 gap-3',
                !user && 'border-t border-[#E6E6E6] pt-4 dark:border-[#1A1A1A]',
              )}
            >
              {isLoading ? (
                <p className="px-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Checking your account...
                </p>
              ) : !user ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#E6E6E6] px-3 py-2 text-sm font-medium text-foreground transition hover:bg-[#E6E6E6] dark:border-[#4D4D4D] dark:hover:bg-[#1A1A1A]"
                    href="/login"
                    onClick={closeDrawer}
                  >
                    Login
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full bg-[#0D0D0D] px-3 py-2 text-sm font-medium !text-background transition hover:bg-[#1A1A1A] dark:bg-white dark:hover:bg-[#E6E6E6]"
                    href="/login"
                    onClick={closeDrawer}
                  >
                    Become a creator
                  </Link>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function formatCreatorTier(accountType: ProfileResponse['accountType']) {
  if (accountType === 'OFFICIAL') return 'Official creator';
  if (accountType === 'STARTER') return 'Starter creator';
  return 'Creator';
}

function ProfileStat({ label, value }: { label: string; value?: number }) {
  return (
    <span className="px-2 text-center first:pl-0 last:pr-0">
      <span className="block text-sm font-semibold !text-on-dark">
        {value ?? '—'}
      </span>
      <span className="mt-0.5 block text-[0.62rem] uppercase tracking-[0.12em] !text-on-dark-muted">
        {label}
      </span>
    </span>
  );
}

function DrawerShortcut({
  href,
  icon,
  label,
  onSelect,
}: {
  href: Route;
  icon: 'collections' | 'following' | 'notifications' | 'saved';
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      className="group flex min-h-16 items-center gap-2.5 rounded-2xl border border-[#E6E6E6] bg-[#FAFAFA] px-3 py-2.5 text-xs font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-[#BDBDBD] hover:bg-white hover:shadow-[0_10px_24px_rgba(13,13,13,0.08)] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:hover:border-[#BDBDBD] dark:hover:bg-[#242424] dark:hover:shadow-none"
      href={href}
      onClick={onSelect}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-brand-mid shadow-sm transition group-hover:scale-105 dark:bg-[#0D0D0D]">
        <DrawerIcon name={icon} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function DrawerIcon({ name }: { name: string }) {
  const common = {
    className: 'size-4.5 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  };

  if (name === 'home') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="m3 11 9-7 9 7" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m16.5 16.5 4 4" />
      </svg>
    );
  }
  if (name === 'explore') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      </svg>
    );
  }
  if (name === 'create') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M12 3v18M3 12h18" />
        <path d="m17 4 .5 1.5L19 6l-1.5.5L17 8l-.5-1.5L15 6l1.5-.5L17 4Z" />
      </svg>
    );
  }
  if (name === 'saved') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M6 4h12v17l-6-4-6 4V4Z" />
      </svg>
    );
  }
  if (name === 'collections') {
    return (
      <svg aria-hidden="true" {...common}>
        <rect height="7" rx="1" width="7" x="3" y="3" />
        <rect height="7" rx="1" width="7" x="14" y="3" />
        <rect height="7" rx="1" width="7" x="3" y="14" />
        <rect height="7" rx="1" width="7" x="14" y="14" />
      </svg>
    );
  }
  if (name === 'following') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M16 8h5M18.5 5.5v5" />
      </svg>
    );
  }
  if (name === 'notifications') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8ZM10 21h4" />
      </svg>
    );
  }
  return null;
}
