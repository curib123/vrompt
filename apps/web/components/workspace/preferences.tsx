'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme } from '@/components/theme/theme-provider';
import { apiRequest } from '@/lib/api';
import { useFeedback } from '@/components/ui/feedback-modal';
export type Preferences = {
  displayName: string;
  defaultModelId: string | null;
  sendOnEnter: boolean;
};
export function UserPreferences() {
  const { user, accessToken, logout } = useAuth();
  const { alert, confirm } = useFeedback();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<Preferences>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void apiRequest<Preferences>('/workspace/preferences', {
      accessToken,
      signal: controller.signal,
    })
      .then(setPreferences)
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [accessToken]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!preferences || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setPreferences(
        await apiRequest<Preferences>('/workspace/preferences', {
          accessToken: accessToken!,
          method: 'PATCH',
          body: JSON.stringify({ ...preferences, defaultModelId: null }),
        }),
      );
      setNotice('Your preferences are saved.');
      alert({
        tone: 'success',
        title: 'Preferences saved',
        message: 'Your workspace will use these preferences for future chats.',
      });
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      alert({ tone: 'error', title: 'Could not save preferences', message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-page">
      <p className="eyebrow">YOUR WORKSPACE, YOUR WAY</p>
      <h1>Settings</h1>
      <p className="muted">
        A few small adjustments for a more personal workspace.
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-banner" role="status">
          {notice}
        </p>
      )}
      <section className="panel">
        <h2>Your account</h2>
        <p>{user?.email}</p>
        <p className="muted">
          Sign-in is managed through your connected Google or GitHub account.
        </p>
      </section>
      <section className="panel">
        <h2>Chat preferences</h2>
        {preferences ? (
          <form onSubmit={save}>
            <label>
              Display name
              <input
                required
                maxLength={80}
                value={preferences.displayName}
                disabled={busy}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    displayName: e.target.value,
                  })
                }
              />
            </label>
            <p className="muted">
              Every new chat starts with Auto ? Recommended. Choose a model in
              the chat whenever you need one.
            </p>
            <label>
              Send a message with
              <select
                value={preferences.sendOnEnter ? 'enter' : 'button'}
                disabled={busy}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    sendOnEnter: e.target.value === 'enter',
                  })
                }
              >
                <option value="enter">
                  Enter (Shift + Enter for a new line)
                </option>
                <option value="button">
                  Send button (Enter adds a new line)
                </option>
              </select>
            </label>
            <div>
              <button className="primary-button" disabled={busy}>
                {busy ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </form>
        ) : (
          !error && (
            <p className="muted" role="status">
              Loading preferences…
            </p>
          )
        )}
      </section>
      <section className="panel">
        <h2>Appearance</h2>
        <label className="config-label">
          Theme
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as 'system' | 'light' | 'dark')
            }
          >
            <option value="system">Match device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p className="muted">Appearance is saved on this device.</p>
      </section>
      <section className="panel">
        <h2>Account & privacy</h2>
        <div className="row">
          <Link href="/billing">Manage subscription</Link>
          <Link href="/privacy">Privacy policy</Link>
          <button
            className="secondary-button"
            onClick={async () => {
              const accepted = await confirm({
                title: 'Sign out?',
                message: 'You can sign back in whenever you want to continue.',
                confirmLabel: 'Sign out',
              });
              if (!accepted) return;
              try {
                await logout();
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Unable to sign out. Please retry.';
                setError(message);
                alert({ tone: 'error', title: 'Could not sign out', message });
              }
            }}
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
