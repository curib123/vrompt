'use client';

import { FormEvent, useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type {
  AdminBillingOverview,
  AdminBillingPayment,
  AdminBillingWebhookFailure,
  AdminDiscountCode,
} from '@/lib/api';
import { createAdminDiscount } from '@/lib/api';

export function AdminBillingView() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<AdminBillingOverview | null>(null);
  const [payments, setPayments] = useState<AdminBillingPayment[]>([]);
  const [failures, setFailures] = useState<AdminBillingWebhookFailure[]>([]);
  const [discounts, setDiscounts] = useState<AdminDiscountCode[]>([]);
  const [discountError, setDiscountError] = useState('');
  const [discountBusy, setDiscountBusy] = useState(false);
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
      apiRequest<AdminDiscountCode[]>('/admin/billing/discounts', {
        accessToken,
      }),
    ])
      .then(([nextOverview, nextPayments, nextFailures, nextDiscounts]) => {
        setOverview(nextOverview);
        setPayments(nextPayments);
        setFailures(nextFailures);
        setDiscounts(nextDiscounts);
      })
      .catch(() => setError('Billing operations could not be loaded.'));
  }, [accessToken]);

  if (!overview) return <Skeleton className="h-96" />;

  async function submitDiscount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setDiscountBusy(true);
    setDiscountError('');
    const form = new FormData(event.currentTarget);
    try {
      const discount = await createAdminDiscount(accessToken, {
        code: form.get('code'),
        name: form.get('name'),
        type: form.get('type'),
        value: Number(form.get('value')),
        startsAt: form.get('startsAt'),
        endsAt: form.get('endsAt'),
        maxRedemptions: form.get('maxRedemptions')
          ? Number(form.get('maxRedemptions'))
          : undefined,
        maxRedemptionsPerUser: Number(form.get('maxRedemptionsPerUser') || 1),
      });
      setDiscounts((current) => [discount, ...current]);
      event.currentTarget.reset();
    } catch (requestError) {
      setDiscountError(
        requestError instanceof Error
          ? requestError.message
          : 'Discount could not be created.',
      );
    } finally {
      setDiscountBusy(false);
    }
  }
  return (
    <div className="grid gap-6">
      <header className="grid gap-4">
        <Badge>Freemium analytics</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em]">
          Plans, usage, and billing health.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-brand-mid">
          Understand how Free converts to Pro and where AI allowance is being
          consumed, using verified backend payment state only.
        </p>
      </header>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Free users" value={overview.users.free} />
        <Metric label="Pro users" value={overview.users.pro} />
        <Metric
          label="Pro share"
          suffix="%"
          value={overview.analytics.proSharePercent}
        />
        <Metric
          label="Checkout conversion"
          suffix="%"
          value={overview.analytics.checkoutConversionPercent}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-sm text-brand-mid">Verified retained revenue</p>
          <p className="mt-2 text-3xl font-semibold">
            {formatMoney(
              overview.analytics.retainedRevenueCentavos,
              overview.analytics.currency,
            )}
          </p>
          <p className="mt-2 text-xs text-brand-mid">
            {formatMoney(
              overview.analytics.retainedRevenue30DaysCentavos,
              overview.analytics.currency,
            )}{' '}
            in the last 30 days. Refunded payments are excluded.
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-brand-mid">AI operations today</p>
              <p className="mt-2 text-3xl font-semibold">
                {overview.aiUsageToday.toLocaleString()}
              </p>
            </div>
            <Badge>UTC day</Badge>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            {(['GUEST', 'FREE', 'PRO'] as const).map((plan) => (
              <div
                className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-950"
                key={plan}
              >
                <p className="text-xs text-brand-mid">{plan}</p>
                <p className="mt-1 text-xl font-semibold">
                  {overview.usageByPlan[plan].toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h2 className="text-xl font-semibold">Create discount code</h2>
        <p className="mt-1 text-sm text-brand-mid">
          Discounts are validated again at checkout and reserved atomically.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={submitDiscount}
        >
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            name="code"
            placeholder="Code, e.g. LAUNCH70"
            required
          />
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            name="name"
            placeholder="Campaign name"
            required
          />
          <select
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            defaultValue="PERCENTAGE"
            name="type"
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount (centavos)</option>
          </select>
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            min="1"
            name="value"
            placeholder="Value (70 = 70%)"
            required
            type="number"
          />
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            name="startsAt"
            required
            type="datetime-local"
          />
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            name="endsAt"
            required
            type="datetime-local"
          />
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            min="1"
            name="maxRedemptions"
            placeholder="Total uses (optional)"
            type="number"
          />
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm"
            defaultValue="1"
            min="1"
            name="maxRedemptionsPerUser"
            placeholder="Uses per member"
            required
            type="number"
          />
          <button
            className="min-h-11 rounded-full bg-[#0D0D0D] px-4 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
            disabled={discountBusy}
            type="submit"
          >
            {discountBusy ? 'Creating…' : 'Create discount'}
          </button>
        </form>
        {discountError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-300" role="alert">
            {discountError}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3">
          {discounts.map((discount) => (
            <div
              className="rounded-2xl border border-zinc-200 p-4 text-sm dark:border-zinc-800"
              key={discount.id}
            >
              <div className="flex flex-wrap justify-between gap-2">
                <strong>
                  {discount.code} · {discount.name}
                </strong>
                <Badge>{discount.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="mt-2 text-brand-mid">
                {discount.type === 'PERCENTAGE'
                  ? `${discount.value}% off`
                  : `${(discount.value / 100).toFixed(2)} PHP off`}{' '}
                · {discount.redemptionCount}
                {discount.maxRedemptions
                  ? `/${discount.maxRedemptions}`
                  : ''}{' '}
                reserved
              </p>
              <p className="mt-1 text-xs text-brand-mid">
                {new Date(discount.startsAt).toLocaleString()} →{' '}
                {new Date(discount.endsAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Payment funnel</h2>
            <p className="mt-1 text-sm text-brand-mid">
              Current state of every checkout attempt.
            </p>
          </div>
          <Badge>{overview.activeSubscriptions} active Pro</Badge>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {paymentStates.map(({ key, label }) => (
            <div
              className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
              key={key}
            >
              <p className="text-xs uppercase tracking-[0.12em] text-brand-mid">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {(overview.payments[key] ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-brand-mid">
          {overview.failedWebhooks.toLocaleString()} webhook failures currently
          require attention.
        </p>
      </Card>
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

const paymentStates = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'PAID', label: 'Paid' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: 'REFUNDED', label: 'Refunded' },
  { key: 'REQUIRES_ACTION', label: 'Needs action' },
] as const;

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
  }).format(value / 100);
}

function Metric({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card>
      <p className="text-sm text-brand-mid">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {value.toLocaleString()}
        {suffix}
      </p>
    </Card>
  );
}
