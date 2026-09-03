'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type {
  AdminBillingOverview,
  AdminBillingPayment,
  AdminBillingWebhookFailure,
} from '@/lib/api';

export function AdminBillingView() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null);
  const [payments, setPayments] = useState<AdminBillingPayment[]>([]);
  const [failures, setFailures] = useState<AdminBillingWebhookFailure[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      apiRequest<AdminBillingOverview>('/admin/billing/overview', {
        accessToken,
      }),
      apiRequest<AdminBillingPayment[]>('/admin/billing/payments', {
        accessToken,
      }),
      apiRequest<AdminBillingWebhookFailure[]>(
        '/admin/billing/webhook-failures',
        { accessToken },
      ),
    ])
      .then(([nextOverview, nextPayments, nextFailures]) => {
        setOverview(nextOverview);
        setPayments(nextPayments);
        setFailures(nextFailures);
      })
      .catch(() => setError('Billing operations could not be loaded.'));
  }, [accessToken]);

  if (!overview) return <Skeleton className="h-96" />;
  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <Badge>Operations</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em]">
          Billing health.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-brand-mid">
          Payment state and webhook health without exposing gateway secrets or
          card data.
        </p>
      </header>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Free users" value={overview.users.free} />
        <Metric label="Pro users" value={overview.users.pro} />
        <Metric label="AI uses today" value={overview.aiUsageToday} />
        <Metric label="Webhook failures" value={overview.failedWebhooks} />
      </div>
      <Card>
        <h2 className="text-xl font-semibold">Recent payments</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-brand-mid">
              <tr>
                <th className="pb-3">Member</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  className="border-t border-zinc-100 dark:border-zinc-800"
                  key={payment.id}
                >
                  <td className="py-3">
                    <span className="font-medium">
                      @{payment.user.username}
                    </span>
                    <span className="block text-xs text-brand-mid">
                      {payment.user.email}
                    </span>
                  </td>
                  <td className="py-3">
                    {payment.currency} {(payment.amount / 100).toFixed(2)}
                  </td>
                  <td className="py-3">{payment.status}</td>
                  <td className="py-3 text-brand-mid">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 ? (
            <p className="py-6 text-sm text-brand-mid">No payments yet.</p>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Webhook failures</h2>
        <ul className="mt-4 grid gap-3 text-sm">
          {failures.map((failure) => (
            <li
              className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-950"
              key={failure.externalEventId}
            >
              <span className="font-mono">{failure.eventType}</span>
              <span className="ml-2 text-brand-mid">
                {failure.errorCode ?? 'Unknown error'} ·{' '}
                {new Date(failure.receivedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {failures.length === 0 ? (
          <p className="mt-4 text-sm text-brand-mid">
            No failed webhook events.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-sm text-brand-mid">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value.toLocaleString()}</p>
    </Card>
  );
}
