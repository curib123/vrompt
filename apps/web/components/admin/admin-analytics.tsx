'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { AnalyticsSummaryResponse } from '@/lib/api';

const presets = ['week', 'month', 'year', 'custom'] as const;

export function AdminAnalytics() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [preset, setPreset] = useState<(typeof presets)[number]>('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return undefined;
    let active = true;
    const params = new URLSearchParams({ preset });
    if (preset === 'custom' && from)
      params.set('from', new Date(`${from}T00:00:00`).toISOString());
    if (preset === 'custom' && to)
      params.set('to', new Date(`${to}T23:59:59`).toISOString());
    void apiRequest<AnalyticsSummaryResponse>(`/analytics/summary?${params}`, {
      accessToken,
    })
      .then((value) => {
        if (active) {
          setData(value);
          setError('');
        }
      })
      .catch((caught: unknown) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : 'Analytics could not be loaded',
          );
      });
    return () => {
      active = false;
    };
  }, [accessToken, from, preset, revision, to]);

  const buckets = useMemo(() => {
    const values = new Map<string, number>();
    for (const item of data?.trends ?? [])
      values.set(item.bucket, (values.get(item.bucket) ?? 0) + item.count);
    return [...values.entries()];
  }, [data]);
  const maximum = Math.max(...buckets.map(([, count]) => count), 1);

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-mid">
              Privacy-conscious growth
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
              Analytics
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-mid">
              Understand acquisition, retention, conversion, and product
              activity without collecting raw IP addresses or personal browsing
              histories.
            </p>
          </div>
          <Button
            onClick={() => setRevision((value) => value + 1)}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
      </Card>
      <Card className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((value) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium ${preset === value ? 'bg-[#0D0D0D] text-white dark:bg-white dark:text-black' : 'bg-[#F0F0EE] text-brand-mid dark:bg-[#242424]'}`}
              key={value}
              onClick={() => setPreset(value)}
              type="button"
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
        {preset === 'custom' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              From
              <Input
                onChange={(event) => setFrom(event.target.value)}
                type="date"
                value={from}
              />
            </label>
            <label className="grid gap-2 text-sm">
              To
              <Input
                onChange={(event) => setTo(event.target.value)}
                type="date"
                value={to}
              />
            </label>
          </div>
        ) : null}
      </Card>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Sessions" value={data.overview.sessions} />
            <Kpi label="Organic visits" value={data.overview.organicVisits} />
            <Kpi label="Returning users" value={data.overview.returningUsers} />
            <Kpi
              label="Signup conversion"
              suffix="%"
              value={data.overview.signupConversionRate}
            />
          </div>
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Activity trend</h2>
                <p className="mt-1 text-xs text-brand-mid">
                  All privacy-safe events by {data.period.granularity}
                </p>
              </div>
              <p className="text-xs text-brand-mid">
                {new Date(data.period.from).toLocaleDateString()} –{' '}
                {new Date(data.period.to).toLocaleDateString()}
              </p>
            </div>
            <div className="mt-8 flex h-56 items-end gap-1 overflow-x-auto border-b border-[#D8D8D8] px-1 dark:border-[#333]">
              {buckets.length ? (
                buckets.map(([bucket, count]) => (
                  <div
                    className="group flex h-full min-w-5 flex-1 items-end"
                    key={bucket}
                    title={`${new Date(bucket).toLocaleDateString()}: ${count}`}
                  >
                    <div
                      className="w-full rounded-t bg-[#0D0D0D] transition hover:bg-emerald-500 dark:bg-white"
                      style={{
                        height: `${Math.max(3, (count / maximum) * 100)}%`,
                      }}
                    />
                  </div>
                ))
              ) : (
                <p className="m-auto text-sm text-brand-mid">
                  No activity in this period.
                </p>
              )}
            </div>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-xl font-semibold">Acquisition</h2>
              <div className="mt-5 grid gap-3">
                {data.acquisition.length ? (
                  data.acquisition.map((item) => (
                    <div
                      className="flex items-center justify-between rounded-xl bg-[#F5F5F3] px-4 py-3 text-sm dark:bg-[#202020]"
                      key={item.source}
                    >
                      <span className="capitalize">{item.source}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-brand-mid">
                    No landing visits recorded.
                  </p>
                )}
              </div>
            </Card>
            <Card>
              <h2 className="text-xl font-semibold">Signup funnel</h2>
              <div className="mt-5 grid gap-3">
                <Funnel
                  label="Landing views"
                  value={data.overview.landingViews}
                />
                <Funnel
                  label="Signup starts"
                  value={data.overview.signupStarts}
                />
                <Funnel
                  label="Completed signups"
                  value={data.overview.completedSignups}
                />
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <p className="text-sm text-brand-mid">Loading analytics…</p>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-semibold tracking-[-0.05em]">
        {value.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-brand-mid">
        {label}
      </p>
    </Card>
  );
}
function Funnel({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#E6E6E6] pb-3 text-sm last:border-0 dark:border-[#292929]">
      <span className="text-brand-mid">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
