'use client';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme } from '@/components/theme/theme-provider';
import { Icon, type IconName } from '@/components/ui/icon';
import { useSiteSettings } from '@/components/providers/site-settings-provider';
import { SignInButton } from '@/components/providers/auth-dialog-provider';
const navigationIcons: Record<string, IconName> = {
  '/chat': 'chat',
  '/conversations': 'history',
  '/projects': 'folder',
  '/saved-prompts': 'library',
  '/workflows': 'workflow',
  '/usage': 'chart',
  '/billing': 'card',
  '/settings': 'settings',
  '/admin': 'grid',
  '/admin/models': 'cube',
  '/admin/plans': 'library',
  '/admin/analytics': 'chart',
  '/admin/users': 'users',
  '/admin/billing': 'card',
  '/admin/audit': 'shield',
  '/admin/settings': 'settings',
  '/models': 'cube',
};
export const workspaceLinks = [
  ['/chat', 'New Chat'],
  ['/conversations', 'Conversations'],
  ['/models', 'Models'],
  ['/projects', 'Projects'],
  ['/saved-prompts', 'Saved Prompts'],
  ['/workflows', 'Workflows'],
  ['/usage', 'Usage'],
  ['/billing', 'Billing'],
  ['/settings', 'Settings'],
] as const;
export function WorkspaceShell({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, isLoading, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { announcement } = useSiteSettings();
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current?.querySelector<HTMLElement>('a')?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key !== 'Tab') return;
      const targets =
        sidebar.current?.querySelectorAll<HTMLElement>('a,button');
      if (!targets?.length) return;
      const first = targets[0],
        last = targets[targets.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keydown);
    };
  }, [open]);
  if (isLoading)
    return <main className="center-page">Opening your workspace…</main>;
  if (!user && (admin || pathname !== '/chat'))
    return (
      <main className="center-page">
        <h1>Your AI workspace awaits.</h1>
        <p>Sign in to keep your conversations private and synced.</p>
        <SignInButton className="primary-button" returnTo={pathname}>
          Sign in
        </SignInButton>
      </main>
    );
  if (admin && user?.role !== 'ADMIN')
    return <main className="center-page">Administrator access required.</main>;
  if (!admin && user && user.role !== 'USER')
    return (
      <main className="center-page">
        <Link href="/admin">Open administration</Link>
      </main>
    );
  const links = admin
    ? [
        ['/admin', 'Overview'],
        ['/admin/models', 'Models & routing'],
        ['/admin/plans', 'Plans & allowances'],
        ['/admin/analytics', 'Costs & revenue'],
        ['/admin/users', 'Users'],
        ['/admin/billing', 'Billing'],
        ['/admin/audit', 'Audit history'],
        ['/admin/settings', 'Settings'],
      ]
    : workspaceLinks;
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      <header className="mobile-workspace-header">
        <button
          ref={menuButton}
          aria-controls="workspace-navigation"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Icon name="menu" />
        </button>
        <Link aria-label="Vrompt workspace" href="/chat">
          <BrandLockup compact />
        </Link>
      </header>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="workspace-navigation"
        className={`workspace-sidebar ${open ? 'is-open' : ''}`}
      >
        <Link
          aria-label="Vrompt workspace"
          className="workspace-brand"
          href={admin ? '/admin' : '/chat'}
        >
          <BrandLockup compact />
        </Link>
        <p className="eyebrow">
          {admin ? 'ADMINISTRATION' : 'YOUR AI WORKSPACE'}
        </p>
        <nav aria-label={admin ? 'Administration' : 'Workspace'}>
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href as Route}
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? 'page' : undefined}
            >
              <Icon name={navigationIcons[href] ?? 'grid'} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/docs">
            <Icon name="help" /> Help & getting started
          </Link>
          <button onClick={toggleTheme}>
            <Icon name="sun" /> Change theme
          </button>
          <div className="sidebar-account">
            <span className="account-avatar">
              {user?.username.slice(0, 2).toUpperCase() ?? 'V'}
            </span>
            <span>
              <strong>{user?.username ?? 'Welcome to Vrompt'}</strong>
              <small>{user?.email ?? 'Temporary guest chat'}</small>
            </span>
          </div>
          {user && (
            <button onClick={() => void logout()}>
              <Icon name="logout" /> Sign out
            </button>
          )}
          {!user && <SignInButton>Sign in to save your work</SignInButton>}
          <Link href="/">About Vrompt</Link>
        </div>
      </aside>
      <main className="workspace-main" id="workspace-content">
        {announcement && (
          <div className="site-announcement">{announcement}</div>
        )}
        {children}
      </main>
    </div>
  );
}
