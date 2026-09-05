'use client';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme } from '@/components/theme/theme-provider';
export const workspaceLinks = [['/chat', 'New Chat'], ['/conversations', 'Conversations'], ['/saved-prompts', 'Saved Prompts'], ['/usage', 'Usage'], ['/billing', 'Subscription / Billing'], ['/settings', 'Settings']] as const;
export function WorkspaceShell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, isLoading, logout } = useAuth(); const { toggleTheme } = useTheme(); const pathname = usePathname(); const [open, setOpen] = useState(false);
  if (isLoading) return <main className="center-page">Opening your workspace…</main>;
  if (!user) return <main className="center-page"><h1>Your AI workspace awaits.</h1><p>Sign in to keep your conversations private and synced.</p><Link className="primary-button" href="/login">Sign in</Link></main>;
  if (admin && user.role !== 'ADMIN') return <main className="center-page">Administrator access required.</main>;
  if (!admin && user.role !== 'USER') return <main className="center-page"><Link href="/admin">Open administration</Link></main>;
  const links = admin ? [['/admin', 'Overview'], ['/admin/models', 'Models & routing'], ['/admin/plans', 'Plans & allowances'], ['/admin/analytics', 'Costs & revenue'], ['/admin/users', 'Users'], ['/admin/billing', 'Billing'], ['/admin/audit', 'Audit history']] : workspaceLinks;
  return <div className="workspace-shell">
    <header className="mobile-workspace-header"><button aria-label="Toggle navigation" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button><Link href="/chat">vrompt<span className="brand-dot">✳</span></Link></header>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`workspace-sidebar ${open ? 'is-open' : ''}`}><Link className="workspace-brand" href={admin ? '/admin' : '/chat'}>vrompt<span className="brand-dot">✳</span></Link><p className="eyebrow">{admin ? 'ADMINISTRATION' : 'YOUR AI WORKSPACE'}</p>
      <nav aria-label={admin ? 'Administration' : 'Workspace'}>{links.map(([href, label]) => <Link key={href} href={href as Route} onClick={() => setOpen(false)} aria-current={pathname === href ? 'page' : undefined}>{href === '/chat' ? '+ ' : ''}{label}</Link>)}</nav>
      <div className="sidebar-bottom"><p>{user.email}</p><button onClick={toggleTheme}>Change theme</button><button onClick={() => void logout()}>Sign out</button><Link href="/">About Vrompt</Link></div>
    </aside><main className="workspace-main">{children}</main>
  </div>;
}
