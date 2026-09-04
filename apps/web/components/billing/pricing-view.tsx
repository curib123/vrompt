'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

import { AuthModalTrigger } from '@/components/auth/auth-modal';
import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button, getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchBillingPlans, startProCheckout } from '@/lib/api';
import type { BillingPlan } from '@/lib/api';

const coreFeatures = [
  'Browse, search, and copy public prompts',
  'Create, publish, and manage your prompts',
  'Save prompts and organize collections',
  'Use version history and adapt shared prompts',
  'Build a profile and join community discussions',
] as const;

export function PricingView() {
  const { accessToken, user } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[] | null>(null);
  const [error, setError] = useState('');
  const [busyPlan, setBusyPlan] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void fetchBillingPlans()
      .then((response) => setPlans(response.plans))
      .catch(() => setError('Plans are temporarily unavailable.'));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  async function upgrade(planCode: string) {
    if (!accessToken) return;
    setBusyPlan(planCode);
    setError('');
    try {
      const checkout = await startProCheckout(
        accessToken,
        discountCode,
        planCode,
      );
      if (checkout.checkoutUrl) window.location.assign(checkout.checkoutUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Checkout could not be started.',
      );
      setBusyPlan('');
    }
  }

  return (
    <div className="grid gap-8">
      <header className="grid gap-4 text-center">
        <Badge>Vrompt plans</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          Use every core feature for free. Upgrade for more AI capacity.
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-8 text-brand-mid">
          Free and Pro include the complete prompt workspace. Pro currently
          increases the AI generation allowance for people who use it more
          often.
        </p>
      </header>
      {error ? (
        <p
          className="text-center text-sm text-red-600 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {user ? (
        <div className="mx-auto grid w-full max-w-xl gap-2 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <label className="text-sm font-semibold" htmlFor="discount-code">
            Promotion code (optional)
          </label>
          <input
            className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 text-sm uppercase dark:border-zinc-700"
            id="discount-code"
            maxLength={64}
            onChange={(event) => setDiscountCode(event.target.value)}
            placeholder="Enter a code"
            value={discountCode}
          />
          <p className="text-xs text-brand-mid">
            The backend validates eligibility and calculates the final checkout
            price.
          </p>
        </div>
      ) : null}
      {!plans ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div
          className={`grid gap-4 ${plans.length > 2 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}
        >
          {plans.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            const isPaid = plan.originalPrice > 0;
            const remainingMs = plan.promotion
              ? Math.max(new Date(plan.promotion.endsAt).getTime() - now, 0)
              : 0;
            return (
              <Card className={isPaid ? 'border-brand-mid' : ''} key={plan.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm leading-6 text-brand-mid">
                      {plan.description}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">{plan.name}</h2>
                  </div>
                  {isCurrent ? <Badge>Current plan</Badge> : null}
                </div>
                {plan.promotion ? (
                  <div className="mt-6 flex items-center gap-2">
                    <Badge>
                      {plan.promotion.discountType === 'PERCENTAGE'
                        ? `${plan.promotion.discountValue}% OFF`
                        : 'SPECIAL OFFER'}
                    </Badge>
                    <span className="text-sm text-brand-mid line-through">
                      {formatPlanPrice(plan.originalPrice, plan.currency)}
                    </span>
                  </div>
                ) : null}
                <p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">
                  {plan.priceCentavos === 0
                    ? 'Free'
                    : formatPlanPrice(plan.priceCentavos, plan.currency)}
                </p>
                <p className="mt-1 text-sm text-brand-mid">
                  {plan.billingPeriod}
                </p>
                <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                  <p className="text-sm font-semibold">Core Vrompt features</p>
                  <ul className="mt-4 grid gap-3 text-sm leading-6 text-brand-mid">
                    {coreFeatures.map((feature) => (
                      <li className="flex gap-2" key={feature}>
                        <span aria-hidden="true" className="text-emerald-600">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-7 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      AI generation capacity
                    </p>
                    {isPaid ? <Badge>Higher limits</Badge> : null}
                  </div>
                  <ul className="mt-8 grid gap-3 text-sm leading-6 text-brand-mid">
                    {plan.features.map((feature) => (
                      <li
                        className="flex gap-2"
                        key={`${feature.key}-${feature.resetPeriod}`}
                      >
                        <span aria-hidden="true" className="text-emerald-600">
                          ✓
                        </span>
                        <span>
                          {feature.limit === null
                            ? `Unlimited ${feature.name}`
                            : `${feature.limit.toLocaleString()} ${feature.unitLabel} ${feature.resetPeriod === 'DAILY' ? 'per day' : 'per month'}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  {isCurrent ? (
                    <Link
                      className={getButtonClasses('secondary') + ' w-full'}
                      href={'/billing' as Route}
                    >
                      View billing
                    </Link>
                  ) : isPaid ? (
                    user ? (
                      <Button
                        className="w-full"
                        disabled={Boolean(busyPlan)}
                        onClick={() => void upgrade(plan.id)}
                      >
                        {busyPlan === plan.id
                          ? 'Opening secure checkout…'
                          : `Choose ${plan.name}`}
                      </Button>
                    ) : (
                      <AuthModalTrigger
                        className={getButtonClasses('primary') + ' w-full'}
                        description="Sign in so Vrompt can securely attach your purchase to your account."
                        returnTo="/pricing"
                        title={`Choose ${plan.name}`}
                      >
                        Sign in to upgrade
                      </AuthModalTrigger>
                    )
                  ) : null}
                </div>
                {plan.promotion ? (
                  <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <strong>{plan.promotion.name}</strong> · Ends{' '}
                    {new Date(plan.promotion.endsAt).toLocaleString(undefined, {
                      timeZone: plan.promotion.timezone,
                    })}{' '}
                    ({plan.promotion.timezone}).{' '}
                    {remainingMs > 0
                      ? `${Math.floor(remainingMs / 3_600_000)}h ${Math.floor((remainingMs % 3_600_000) / 60_000)}m remaining.`
                      : 'Offer expired.'}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs leading-6 text-brand-mid">
        Paid plans are charged in USD and processed securely by PayMongo.
        International Visa and Mastercard cards are supported; your bank may
        apply conversion fees. Vrompt never receives or stores card details.
      </p>
    </div>
  );
}

function formatPlanPrice(amount: number, currency: string) {
  return `${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)} ${currency}`;
}
