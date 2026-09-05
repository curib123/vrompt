'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme } from '@/components/theme/theme-provider';
import { apiRequest, type Model } from '@/lib/api';
export type Preferences = {
  displayName: string;
  defaultModelId: string | null;
  sendOnEnter: boolean;
};
export function UserPreferences() {
  const { user, accessToken, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<Preferences>();
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void Promise.all([
      apiRequest<Preferences>('/workspace/preferences', {
        accessToken,
        signal: controller.signal,
      }),
      apiRequest<Model[]>('/workspace/models', {
        accessToken,
        signal: controller.signal,
      }),
    ])
      .then(([p, m]) => {
        setPreferences(p);
        setModels(m);
      })
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
          body: JSON.stringify(preferences),
        }),
      );
      setNotice('Your preferences are saved.');
    } catch (e) {
      setError((e as Error).message);
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
            <label>
              Default model
              <select
                value={preferences.defaultModelId ?? ''}
                disabled={busy}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    defaultModelId: e.target.value || null,
                  })
                }
              >
                <option value="">Auto — recommended</option>
                {preferences.defaultModelId &&
                  !models.some((m) => m.id === preferences.defaultModelId) && (
                    <option value={preferences.defaultModelId}>
                      Previously selected model (unavailable)
                    </option>
                  )}
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              New chats use this model when it is available on your plan.
              Otherwise, they start with Auto.
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
          <button className="secondary-button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
