import { Suspense } from 'react';

import { CheckoutStatusView } from '@/components/billing/checkout-status-view';

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="h-64 animate-pulse rounded-[1.5rem] bg-zinc-100 dark:bg-zinc-900" />
      }
    >
      <CheckoutStatusView />
    </Suspense>
  );
}
