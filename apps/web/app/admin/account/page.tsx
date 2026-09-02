'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';

export default function StaffSecurityPage() {
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    if (newPassword !== confirmation) {
      setError('New passwords do not match');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiRequest('/auth/staff/password', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      await logout();
      router.replace('/staff/login');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Password could not be changed',
      );
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-6">
      <Card>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-mid">
          Account security
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
          Change password
        </h1>
        <p className="mt-3 text-sm leading-7 text-brand-mid">
          Use a unique password of at least 12 characters. Changing it signs out
          all active sessions.
        </p>
      </Card>
      <Card className="max-w-xl">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Current password
            <Input
              autoComplete="current-password"
              minLength={12}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            New password
            <Input
              autoComplete="new-password"
              minLength={12}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Confirm new password
            <Input
              autoComplete="new-password"
              minLength={12}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              type="password"
              value={confirmation}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={saving} type="submit">
            {saving ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
