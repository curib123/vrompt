'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button, getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAiUsage, fetchBillingSummary } from '@/lib/api';
import type { AiUsageResponse, BillingSummaryResponse } from '@/lib/api';

export function BillingAccountView() {
  const { accessToken, user } = useAuth();
  const [summary, setSummary] = useState<BillingSummaryResponse | null>(null);
  const [usage, setUsage] = useState<AiUsageResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      fetchBillingSummary(accessToken),
      fetchAiUsage(accessToken),
    ])
      .then(([nextSummary, nextUsage]) => {
        setSummary(nextSummary);
        setUsage(nextUsage);
      })
      .catch(() => setError('Billing details are temporarily unavailable.'));
  }, [accessToken]);

  if (!summary || !usage) {
    return <Skeleton className="h-80" />;
  }

  const periodEnd = summary.subscription?.currentPeriodEnd
    ? new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()
    : null;
  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <Badge>Account billing</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em]">
          Your Vrompt plan.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-brand-mid">
          Keep track of your plan and AI allowance. Payment confirmation always
          comes from Vrompt’s backend.
        </p>
      </header>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-brand-mid">Current plan</p>
          <h2 className="mt-2 text-3xl font-semibold">
            {summary.plan === 'PRO' ? 'Vrompt Pro' : 'Free'}
          </h2>
          <p className="mt-2 text-sm text-brand-mid">
            {summary.subscription?.status === 'ACTIVE' && periodEnd
              ? `Active through ${periodEnd}`
              : 'Public prompt discovery remains available.'}
          </p>
          {summary.plan === 'FREE' ? (
            <Link
              className={getButtonClasses('primary') + ' mt-6'}
              href={'/pricing' as Route}
            >
              Explore Pro
            </Link>
          ) : null}
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-brand-mid">AI generation today</p>
              <h2 className="mt-2 text-3xl font-semibold">
                {usage.remaining} left
              </h2>
            </div>
            <Badge>{usage.plan}</Badge>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-brand-mid"
              style={{
                width: `${usage.limit ? Math.min((usage.used / usage.limit) * 100, 100) : 0}%`,
              }}
            />
          </div>
          <p className="mt-3 text-sm text-brand-mid">
            Resets {new Date(usage.resetAt).toLocaleString()}.
          </p>
        </Card>
      </div>
      {summary.latestPayment ? (
        <Card>
          <h2 className="text-xl font-semibold">Latest payment</h2>
          <p className="mt-2 text-sm text-brand-mid">
            {summary.latestPayment.status} · {summary.latestPayment.currency}{' '}
            {(summary.latestPayment.amount / 100).toFixed(2)} ·{' '}
            {new Date(summary.latestPayment.createdAt).toLocaleDateString()}
          </p>
          <p className="mt-4 text-xs leading-6 text-brand-mid">
            Sensitive payment details are kept with PayMongo.
          </p>
        </Card>
      ) : null}
      <Button onClick={() => window.location.reload()} variant="ghost">
        Refresh billing status
      </Button>
      {user?.plan === 'PRO' ? (
        <p className="text-center text-xs text-brand-mid">
          Pro access is enabled only after verified payment state is recorded.
        </p>
      ) : null}
    </div>
  );
}
