'use client';
import { useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useSiteSettings } from '@/components/providers/site-settings-provider';
import { useAdminResource } from './use-admin-resource';
import { AdminPassword } from './password';

type Setting = {
  key: string;
  group: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
  defaultValue: string | number | boolean;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  updatedAt: string | null;
};

function SettingEditor({
  setting,
  accessToken,
  onSaved,
}: {
  setting: Setting;
  accessToken: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(setting.value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(reset = false) {
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ value: Setting['value'] }>(
        `/admin/settings/${encodeURIComponent(setting.key)}`,
        {
          accessToken,
          method: reset ? 'DELETE' : 'PATCH',
          ...(reset
            ? {}
            : {
                body: JSON.stringify({
                  value:
                    setting.type === 'number'
                      ? Number(value)
                      : setting.type === 'boolean'
                        ? value === 'true'
                        : value,
                }),
              }),
        },
      );
      setValue(String(result.value));
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="setting-row"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div>
        <label htmlFor={setting.key}>{setting.label}</label>
        <p id={`${setting.key}-description`}>{setting.description}</p>
      </div>
      <div className="setting-control">
        {setting.type === 'boolean' ? (
          <select
            id={setting.key}
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby={`${setting.key}-description`}
          >
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        ) : setting.type === 'number' ? (
          <input
            id={setting.key}
            type="number"
            required
            min={setting.minValue ?? 1}
            max={setting.maxValue}
            step="1"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby={`${setting.key}-description`}
          />
        ) : (
          <textarea
            id={setting.key}
            rows={(setting.maxLength ?? 0) > 200 ? 3 : 2}
            maxLength={setting.maxLength}
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby={`${setting.key}-description`}
          />
        )}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="row-actions">
          <button
            type="button"
            disabled={
              busy || String(setting.value) === String(setting.defaultValue)
            }
            onClick={() => void save(true)}
          >
            Reset to default
          </button>
          <button
            className="secondary-button"
            disabled={busy || value === String(setting.value)}
          >
            {busy ? 'Saving…' : 'Save change'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function AdminSettings() {
  const { data, loading, error, refresh, accessToken } =
    useAdminResource<Setting[]>('/admin/settings');
  const { refresh: refreshBrand } = useSiteSettings();
  const [notice, setNotice] = useState('');
  return (
    <div className="content-page">
      <p className="eyebrow">MAKE IT YOURS</p>
      <h1>Workspace settings</h1>
      <p className="muted">
        Manage branding, announcements, registration, and the prompts your users
        start with.
      </p>
      {error && (
        <p role="alert" className="error-banner">
          {error} <button onClick={refresh}>Try again</button>
        </p>
      )}
      {notice && (
        <p role="status" className="success-banner">
          {notice}
        </p>
      )}
      {loading && (
        <p role="status" className="muted">
          Loading settings…
        </p>
      )}
      {data &&
        [...new Set(data.map((setting) => setting.group))].map((group) => (
          <section className="settings-group" key={group}>
            <h2>{group}</h2>
            <div className="panel">
              {data
                .filter((setting) => setting.group === group)
                .map((setting) => (
                  <SettingEditor
                    key={`${setting.key}:${setting.updatedAt}`}
                    setting={setting}
                    accessToken={accessToken!}
                    onSaved={() => {
                      setNotice('Settings saved.');
                      refresh();
                      void refreshBrand().catch(() =>
                        setNotice(
                          'Saved. Public settings will update when the service reconnects.',
                        ),
                      );
                    }}
                  />
                ))}
            </div>
          </section>
        ))}
      <AdminPassword />
    </div>
  );
}
