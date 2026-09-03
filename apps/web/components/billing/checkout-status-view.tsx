'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { fetchPaymentStatus } from '@/lib/api';
import type { PaymentStatusResponse } from '@/lib/api';

export function CheckoutStatusView() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment');
  const { accessToken, refreshSession } = useAuth();
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (
      !accessToken ||
      !paymentId ||
      attempts >= 12 ||
      status?.status === 'PAID' ||
      status?.status === 'FAILED'
    )
      return;
    let active = true;
    const timer = window.setTimeout(
      () => {
        void fetchPaymentStatus(paymentId, accessToken)
          .then((nextStatus) => {
            if (!active) return;
            setStatus(nextStatus);
            setAttempts((value) => value + 1);
            if (nextStatus.status === 'PAID') void refreshSession();
          })
          .catch(() => {
            if (active) setAttempts((value) => value + 1);
          });
      },
      attempts === 0 ? 0 : 2000,
    );
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [accessToken, attempts, paymentId, refreshSession, status?.status]);

  const paid = status?.status === 'PAID';
  const failed =
    status?.status === 'FAILED' ||
    status?.status === 'CANCELLED' ||
    status?.status === 'REFUNDED';
  return (
    <div className="mx-auto grid max-w-2xl gap-6 py-12 text-center">
      <Card>
        <Badge>
          {paid
            ? 'Payment confirmed'
            : failed
              ? 'Payment not completed'
              : 'Payment processing'}
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em]">
          {paid
            ? 'Vrompt Pro is active.'
            : failed
              ? 'Your payment was not completed.'
              : 'Confirming your payment…'}
        </h1>
        <p className="mt-4 text-sm leading-7 text-brand-mid">
          {paid
            ? 'Your account now reflects the verified payment. You can return to generating prompts.'
            : failed
              ? 'No Pro access was granted. You can try checkout again or keep using the free prompt library.'
              : 'We are waiting for the backend payment confirmation. This page does not trust the redirect alone.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex min-h-11 items-center rounded-full bg-[#0D0D0D] px-5 py-2.5 text-sm font-medium text-white"
            href={(paid ? '/billing' : '/pricing') as Route}
          >
            {paid ? 'View billing' : 'Return to pricing'}
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium dark:border-zinc-700"
            href="/search"
          >
            Explore prompts
          </Link>
        </div>
        {!paid && !failed && attempts >= 12 ? (
          <Button
            className="mt-4"
            onClick={() => window.location.reload()}
            variant="ghost"
          >
            Check again
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
