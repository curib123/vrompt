'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '@/components/providers/auth-provider';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import type { AdminDashboardResponse, AnalyticsSummaryResponse } from '@/lib/api';

export function AdminDashboard() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummaryResponse | null>(null);
  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      apiRequest<AdminDashboardResponse>('/admin/dashboard', { accessToken }),
      apiRequest<AnalyticsSummaryResponse>('/analytics/summary?preset=month', { accessToken }),
    ]).then(([dashboard, summary]) => {
      setData(dashboard);
      setAnalytics(summary);
    });
  }, [accessToken]);
  return (
    <div className="grid gap-6">
      <Card className="relative overflow-hidden !border-[#0D0D0D] !bg-[#0D0D0D] p-6 !text-white sm:p-9 dark:!border-white">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-400">
          {user?.role === 'ADMIN' ? 'Administration' : 'Moderation'} workspace
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          Everything important, in view.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
          Monitor the community, respond to reports, and keep operational
          changes accountable.
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {data
          ? Object.entries(data).map(([key, value]) => (
              <Card className="p-5 sm:p-6" key={key}>
                <p className="text-3xl font-semibold tracking-[-0.05em]">
                  {value.toLocaleString()}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.15em] text-brand-mid">
                  {label(key)}
                </p>
              </Card>
            ))
          : Array.from({ length: 6 }, (_, i) => (
              <Card className="h-28 animate-pulse" key={i}>
                <span className="sr-only">Loading metric</span>
              </Card>
            ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Daily active users" value={analytics?.overview.dau} />
        <Metric label="Monthly active users" value={analytics?.overview.mau} />
        <Metric label="Activated users" value={analytics?.overview.activatedUsers} />
        <Metric label="Prompt reuses" value={analytics?.overview.promptReuses} />
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Product health</h2>
          <p className="mt-1 text-sm text-brand-mid">
            {analytics
              ? `${analytics.overview.activationRate}% activation · ${analytics.overview.retention7DayRate}% 7-day retention · ${analytics.overview.limitReached} limit reaches`
              : 'Loading lifecycle metrics…'}
          </p>
        </div>
        <Link className="text-sm font-semibold underline underline-offset-4" href="/admin/analytics">
          Open product analytics →
        </Link>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-[1.5rem] border border-[#E6E6E6] p-6 transition hover:border-black dark:border-[#292929] dark:hover:border-white"
          href="/admin/moderation"
        >
          <span className="text-lg font-semibold">Open moderation queue →</span>
          <p className="mt-2 text-sm text-brand-mid">
            Review reports and take action.
          </p>
        </Link>
        <Link
          className="rounded-[1.5rem] border border-[#E6E6E6] p-6 transition hover:border-black dark:border-[#292929] dark:hover:border-white"
          href="/admin/audit"
        >
          <span className="text-lg font-semibold">Review audit history →</span>
          <p className="mt-2 text-sm text-brand-mid">
            Trace every administrative change.
          </p>
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <Card className="p-5">
      <p className="text-3xl font-semibold tracking-[-0.05em]">
        {value === undefined ? '—' : value.toLocaleString()}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.15em] text-brand-mid">{label}</p>
    </Card>
  );
}

function label(value: string) {
  return value.replace(/([A-Z])/g, ' $1').trim();
}
