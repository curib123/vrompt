'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmationModal } from '@/components/ui/feedback-modal';
import { apiRequest, getMediaUrl } from '@/lib/api';
import type { ProfileResponse } from '@/lib/api';

export function AccountMenu() {
  const router = useRouter();
  const { accessToken, logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadProfile = useEffectEvent(async () => {
    if (!accessToken) return;
    try {
      setProfile(
        await apiRequest<ProfileResponse>('/profiles/me', { accessToken }),
      );
    } catch {
      // Username initials remain a dependable fallback when profile media fails.
    }
  });

  useEffect(() => {
    // The initial profile request synchronizes the account menu with the active session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
    const handleProfileUpdate = () => void loadProfile();
    window.addEventListener('vrompt:profile-updated', handleProfileUpdate);
    return () =>
      window.removeEventListener('vrompt:profile-updated', handleProfileUpdate);
  }, [accessToken]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (!user) return null;

  const displayName = profile?.displayName || user.username;
  const profileHref = `/u/${user.username}` as Route;

  async function confirmAndLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/');
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  }

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Open account menu"
          className="group flex min-h-11 items-center gap-3 rounded-full border border-[#E6E6E6] bg-white p-1.5 pr-3 shadow-[0_8px_24px_rgba(13,13,13,0.08)] transition hover:border-[#0D0D0D] dark:border-[#4D4D4D] dark:bg-[#1A1A1A] dark:hover:border-white"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <Avatar
            avatar={getMediaUrl(profile?.avatar ?? null)}
            className="size-9 shrink-0 border-[#0D0D0D] bg-[#E6E6E6]"
            name={displayName}
          />
          <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
            {displayName}
          </span>
          <span
            aria-hidden="true"
            className="text-xs text-zinc-600 dark:text-zinc-400"
          >
            ⌄
          </span>
        </button>

        {open ? (
          <div
            className="absolute right-0 top-full z-40 mt-3 w-72 overflow-hidden rounded-[1.5rem] border border-[#E6E6E6] bg-white p-2 shadow-[0_24px_60px_rgba(13,13,13,0.18)] dark:border-[#4D4D4D] dark:bg-[#111111]"
            role="menu"
          >
            <div className="m-1 rounded-2xl bg-[#0D0D0D] p-4 text-white">
              <p className="truncate font-semibold">{displayName}</p>
              <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                @{user.username}
              </p>
            </div>
            <MenuLink
              href={profileHref}
              label="Profile workspace"
              onSelect={() => setOpen(false)}
            />
            <MenuLink
              href={`${profileHref}?tab=saved` as Route}
              label="Saved prompts"
              onSelect={() => setOpen(false)}
            />
            <MenuLink
              href="/notifications"
              label="Notifications"
              onSelect={() => setOpen(false)}
            />
            {['ADMIN', 'MODERATOR'].includes(user.role) ? (
              <>
                <MenuLink
                  href={'/admin' as Route}
                  label="Control panel"
                  onSelect={() => setOpen(false)}
                />
                <MenuLink
                  href={'/admin/audiences' as Route}
                  label="Manage audiences"
                  onSelect={() => setOpen(false)}
                />
              </>
            ) : null}
            <button
              className="mt-1 block min-h-11 w-full rounded-2xl px-4 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              role="menuitem"
              type="button"
            >
              Log out
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmationModal
        confirmLabel="Log out"
        description="You will need to sign in again to access your saved prompts, collections, and drafts."
        destructive
        isConfirming={loggingOut}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => void confirmAndLogout()}
        open={confirmLogout}
        title="Log out of Vrompt?"
      />
    </>
  );
}

function MenuLink({
  href,
  label,
  onSelect,
}: {
  href: Route;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      className="block min-h-11 rounded-2xl px-4 py-3 text-sm font-medium text-brand-mid transition hover:bg-[#E6E6E6] hover:text-foreground dark:hover:bg-[#1A1A1A]"
      href={href}
      onClick={onSelect}
      role="menuitem"
    >
      {label}
    </Link>
  );
}
