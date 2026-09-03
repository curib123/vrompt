'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button, getButtonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchBillingPlans, startProCheckout } from '@/lib/api';
import type { BillingPlan } from '@/lib/api';

export function PricingView() {
  const { accessToken, user } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchBillingPlans()
      .then((response) => setPlans(response.plans))
      .catch(() => setError('Plans are temporarily unavailable.'));
  }, []);

  async function upgrade() {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      const checkout = await startProCheckout(accessToken);
      if (checkout.checkoutUrl) window.location.assign(checkout.checkoutUrl);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Checkout could not be started.',
      );
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8">
      <header className="grid gap-4 text-center">
        <Badge>Vrompt plans</Badge>
        <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          More room for the prompts you use.
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-8 text-brand-mid">
          Start free with the public prompt library. Upgrade when you want more
          AI generation capacity and advanced tools.
        </p>
      </header>
      {error ? (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {!plans ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = user?.plan === plan.id;
            const isPro = plan.id === 'PRO';
            return (
              <Card className={isPro ? 'border-brand-mid' : ''} key={plan.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-mid">
                      {plan.id === 'PRO'
                        ? 'For regular AI work'
                        : 'For starting out'}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">{plan.name}</h2>
                  </div>
                  {isCurrent ? <Badge>Current plan</Badge> : null}
                </div>
                <p className="mt-8 text-4xl font-semibold tracking-[-0.06em]">
                  {plan.priceCentavos === 0
                    ? 'Free'
                    : `₱${(plan.priceCentavos / 100).toFixed(0)}`}
                </p>
                <p className="mt-1 text-sm text-brand-mid">
                  {plan.billingPeriod}
                </p>
                <ul className="mt-8 grid gap-3 text-sm leading-6 text-brand-mid">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2" key={feature}>
                      <span aria-hidden="true" className="text-emerald-600">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {isCurrent ? (
                    <Link
                      className={getButtonClasses('secondary') + ' w-full'}
                      href={'/billing' as Route}
                    >
                      View billing
                    </Link>
                  ) : isPro ? (
                    user ? (
                      <Button
                        className="w-full"
                        disabled={busy}
                        onClick={() => void upgrade()}
                      >
                        {busy ? 'Opening secure checkout…' : 'Upgrade to Pro'}
                      </Button>
                    ) : (
                      <Link
                        className={getButtonClasses('primary') + ' w-full'}
                        href="/login?next=/pricing"
                      >
                        Sign in to upgrade
                      </Link>
                    )
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs leading-6 text-brand-mid">
        Payments are processed securely by PayMongo. Vrompt never receives or
        stores card details.
      </p>
    </div>
  );
}
