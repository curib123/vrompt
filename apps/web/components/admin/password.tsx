'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest } from '@/lib/api';
export function AdminPassword() {
  const { accessToken, logout } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function change(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    if (form.get('new') !== form.get('confirm')) {
      setError('The new passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest('/auth/staff/password', {
        accessToken: accessToken!,
        method: 'POST',
        body: JSON.stringify({
          currentPassword: form.get('current'),
          newPassword: form.get('new'),
        }),
      });
      await logout();
      router.push('/staff/login');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-group">
      <h2>Administrator security</h2>
      <div className="panel">
        <p className="muted">
          Changing your password revokes refresh sessions and returns you to
          sign-in.
        </p>
        <form onSubmit={change}>
          <label>
            Current password
            <input
              name="current"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
          </label>
          <div className="form-grid">
            <label>
              New password
              <input
                name="new"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
              />
            </label>
          </div>
          {error && (
            <p className="error-banner" role="alert">
              {error}
            </p>
          )}
          <div>
            <button className="secondary-button" disabled={busy}>
              {busy ? 'Changing password…' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
