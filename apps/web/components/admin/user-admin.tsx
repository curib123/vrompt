'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { AdminUser, AdminUsersResponse } from '@/lib/api';

export function UserAdmin() {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<AdminUsersResponse | null>(null);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
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
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Staff account could not be created',
      );
    }
  }
  async function update(user: AdminUser, body: Record<string, unknown>) {
    if (!accessToken) return;
    try {
      await apiRequest(`/admin/users/${user.id}`, {
        accessToken,
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setRevision((value) => value + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'User could not be updated');
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-mid">
          Administrator only
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
          Users & staff
        </h1>
        <p className="mt-3 text-sm text-brand-mid">
          Search members, control access, and create credential-based staff
          accounts.
        </p>
      </Card>
      <Card>
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
                onChange={(e) => void update(user, { role: e.target.value })}
                value={user.role}
              >
                <option value="USER">User</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button
                onClick={() =>
                  void update(user, {
                    status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
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
      {result ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-mid">{result.total} users</p>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              variant="secondary"
            >
              Previous
            </Button>
            <Button
              disabled={!result.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
