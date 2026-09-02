'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { AdminSetting } from '@/lib/api';

export function SettingsAdmin() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<AdminSetting[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void apiRequest<AdminSetting[]>('/admin/settings', { accessToken })
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : 'Settings could not be loaded',
          );
      });
    return () => {
      active = false;
    };
  }, [accessToken, revision]);
  async function update(key: string, value: string | number | boolean) {
    if (!accessToken) return;
    try {
      await apiRequest(`/admin/settings/${encodeURIComponent(key)}`, {
        accessToken,
        method: 'PATCH',
        body: JSON.stringify({ value }),
      });
      setError('');
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setting could not be updated');
    }
  }
  async function reset(key: string) {
    if (!accessToken) return;
    await apiRequest(`/admin/settings/${encodeURIComponent(key)}`, {
      accessToken,
      method: 'DELETE',
    });
    setRevision((v) => v + 1);
  }
  async function purgeAnalytics() {
    if (!accessToken) return;
    try {
      const result = await apiRequest<{ deletedCount: number }>(
        '/admin/settings/privacy/purge',
        { accessToken, method: 'POST' },
      );
      setError(
        `Retention policy applied. ${result.deletedCount} expired events removed.`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Analytics could not be purged',
      );
    }
  }
  const groups = (settings ?? []).reduce<Record<string, AdminSetting[]>>(
    (result, item) => {
      (result[item.group] ??= []).push(item);
      return result;
    },
    {},
  );
  return (
    <div className="grid gap-6">
      <Card>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-mid">
          Dynamic configuration
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
          Site settings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-mid">
          Control public content, features, moderation safeguards, and privacy
          behavior. Every change is audited.
        </p>
      </Card>
      {error ? (
        <p className="text-sm text-brand-mid" role="status">
          {error}
        </p>
      ) : null}
      {settings ? (
        Object.entries(groups).map(([group, items]) => (
          <section className="grid gap-3" key={group}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{group}</h2>
              {group === 'Privacy' ? (
                <Button
                  onClick={() => void purgeAnalytics()}
                  variant="secondary"
                >
                  Apply retention policy
                </Button>
              ) : null}
            </div>
            {items?.map((setting) => (
              <SettingRow
                key={`${setting.key}:${setting.updatedAt}`}
                onReset={() => void reset(setting.key)}
                onSave={(value) => void update(setting.key, value)}
                setting={setting}
              />
            ))}
          </section>
        ))
      ) : (
        <Card>
          <p className="text-sm text-brand-mid">Loading settings…</p>
        </Card>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  onSave,
  onReset,
}: {
  setting: AdminSetting;
  onSave: (value: string | number | boolean) => void;
  onReset: () => void;
}) {
  const [value, setValue] = useState(setting.value);
  return (
    <Card className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)] md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{setting.label}</h3>
          {setting.isPublic ? (
            <span className="rounded-full bg-[#E6E6E6] px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] dark:bg-[#292929]">
              Public
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-brand-mid">
          {setting.description}
        </p>
        <p className="mt-2 font-mono text-[0.65rem] text-brand-mid">
          {setting.key}
        </p>
      </div>
      <div className="grid gap-2">
        {setting.type === 'boolean' ? (
          <button
            aria-pressed={Boolean(value)}
            className="flex min-h-11 items-center justify-between rounded-2xl border border-[#D8D8D8] px-4 text-sm dark:border-[#3A3A3A]"
            onClick={() => setValue(!value)}
            type="button"
          >
            <span>{value ? 'Enabled' : 'Disabled'}</span>
            <span
              className={`relative h-6 w-11 rounded-full transition ${value ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <span
                className={`absolute top-1 size-4 rounded-full bg-white transition ${value ? 'left-6' : 'left-1'}`}
              />
            </span>
          </button>
        ) : (
          <Input
            aria-label={setting.label}
            maxLength={setting.maxLength}
            onChange={(e) =>
              setValue(
                setting.type === 'number'
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
            type={setting.type === 'number' ? 'number' : 'text'}
            value={String(value)}
          />
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => onSave(value)}>
            Save
          </Button>
          <Button onClick={onReset} variant="ghost">
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}
