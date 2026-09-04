'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { AdminUser, AdminUsersResponse } from '@/lib/api';
import {
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  ConfirmDialog,
} from './admin-ui';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';

export function UserAdmin() {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<AdminUsersResponse | null>(null);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState<{
    user: AdminUser;
    body: Record<string, unknown>;
    label: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    role: 'MODERATOR',
  });

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (appliedQ) params.set('q', appliedQ);
    void apiRequest<AdminUsersResponse>(`/admin/users?${params}`, {
      accessToken,
    })
      .then((response) => {
        if (active) {
          setResult(response);
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : 'Users could not be loaded',
          );
      });
    return () => {
      active = false;
    };
  }, [accessToken, appliedQ, page, revision]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    try {
      await apiRequest('/admin/users', {
        accessToken,
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ email: '', username: '', password: '', role: 'MODERATOR' });
      setRevision((value) => value + 1);
      pushToast({
        title: 'Staff account created',
        description: `@${form.username} can now sign in.`,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Staff account could not be created',
      );
    }
  }
  async function update(user: AdminUser, body: Record<string, unknown>) {
    if (!accessToken) return;
    try {
      setBusy(true);
      await apiRequest(`/admin/users/${user.id}`, {
        accessToken,
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setRevision((value) => value + 1);
      setPendingUpdate(null);
      pushToast({
        title: 'User updated',
        description: `Changes to @${user.username} were saved.`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'User could not be updated');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Administration"
        title="Users & staff"
        description="Search members, control access, and create credential-based staff accounts."
      />
      <Card>
        <div className="mb-4">
          <h2 className="font-semibold">Create staff account</h2>
          <p className="mt-1 text-sm text-brand-mid">
            Use a unique temporary password with at least 12 characters.
          </p>
        </div>
        <form className="grid gap-3 lg:grid-cols-4" onSubmit={create}>
          <Input
            aria-label="Staff email"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Staff email"
            required
            type="email"
            value={form.email}
          />
          <Input
            aria-label="Staff username"
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="Username"
            required
            value={form.username}
          />
          <Input
            aria-label="Temporary password"
            minLength={12}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password (12+ characters)"
            required
            type="password"
            value={form.password}
          />
          <div className="flex gap-2">
            <select
              aria-label="Staff role"
              className="min-h-11 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              value={form.role}
            >
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Card>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setAppliedQ(q.trim());
        }}
      >
        <Input
          aria-label="Search users"
          className="flex-1"
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or username"
          value={q}
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!result && !error ? <AdminLoading label="Loading users" /> : null}
      <div className="grid gap-3">
        {result?.items.map((user) => (
          <Card className="grid gap-4" key={user.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">@{user.username}</p>
                <p className="text-sm text-brand-mid">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <Badge>{user.role}</Badge>
                <Badge>{user.status}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label={`Role for ${user.username}`}
                className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onChange={(e) =>
                  setPendingUpdate({
                    user,
                    body: { role: e.target.value },
                    label: `Change role to ${e.target.value.toLowerCase()}`,
                  })
                }
                value={user.role}
              >
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button
                onClick={() =>
                  setPendingUpdate({
                    user,
                    body: {
                      status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                    },
                    label:
                      user.status === 'ACTIVE'
                        ? 'Suspend user'
                        : 'Restore user',
                  })
                }
                variant="secondary"
              >
                {user.status === 'ACTIVE' ? 'Suspend' : 'Restore'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {result?.items.length === 0 ? (
        <EmptyState
          description="Try a different email or username."
          title="No users found"
        />
      ) : null}
      {result ? (
        <AdminPagination
          hasNextPage={result.hasNextPage}
          onPageChange={setPage}
          page={page}
          total={result.total}
        />
      ) : null}
      <ConfirmDialog
        busy={busy}
        confirmLabel={pendingUpdate?.label ?? 'Confirm'}
        description={
          pendingUpdate
            ? `This changes access for @${pendingUpdate.user.username}. Administrative changes are recorded in the audit log.`
            : ''
        }
        onClose={() => setPendingUpdate(null)}
        onConfirm={() =>
          pendingUpdate && void update(pendingUpdate.user, pendingUpdate.body)
        }
        open={Boolean(pendingUpdate)}
        title={pendingUpdate?.label ?? 'Confirm change'}
      />
    </div>
  );
}
