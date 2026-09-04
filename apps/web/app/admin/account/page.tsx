'use client';

import { useState } from 'react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import { AdminPageHeader } from '@/components/admin/admin-ui';
import { useToast } from '@/components/ui/toast';

export default function StaffSecurityPage() {
  const router = useRouter();
  const { accessToken, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const { pushToast } = useToast();
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
      pushToast({
        title: 'Password updated',
        description: 'For security, sign in again with your new password.',
      });
      await logout();
      router.replace('/staff/login' as Route);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Password could not be changed',
      );
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Account security"
        title="Change password"
        description="Use a unique password of at least 12 characters. Changing it signs out all active sessions."
      />
      <Card className="max-w-xl">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Current password
            <Input
              autoComplete="current-password"
              minLength={12}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              type={showPasswords ? 'text' : 'password'}
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
              type={showPasswords ? 'text' : 'password'}
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
              type={showPasswords ? 'text' : 'password'}
              value={confirmation}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-mid">
            <input
              checked={showPasswords}
              onChange={(event) => setShowPasswords(event.target.checked)}
              type="checkbox"
            />
            Show passwords
          </label>
          <div className="rounded-xl bg-[#F5F5F3] p-3 text-xs leading-5 text-brand-mid dark:bg-[#202020]">
            Use 12 or more characters. A passphrase with mixed words, numbers,
            and symbols is easier to remember and harder to guess.
          </div>
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
