'use client';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Icon } from '@/components/ui/icon';

export type PublicPlan = {
  id: string;
  name: string;
  description: string;
  priceCentavos: number;
  originalPrice?: number;
  currency: string;
  billingPeriod: string;
  monthlyCredits?: number;
  manualModelCount?: number;
  allowances?: { bucket: string; dailyLimit: number; monthlyLimit: number }[];
  features: {
    key: string;
    name: string;
    limit: number | null;
    resetPeriod: string;
  }[];
};
export type PublicPlans = {
  plans: PublicPlan[];
  checkoutAvailable?: boolean;
  paymentMode?: string;
};
export function usePlans() {
  const [data, setData] = useState<PublicPlans>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<PublicPlans>('/billing/plans', {
      signal: controller.signal,
    })
      .then((value) => {
        setData(value);
        setError('');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [attempt]);
  return { data, error, retry: () => setAttempt((value) => value + 1) };
}
export function PlanCards({
  plans,
  onChoose,
  busy = false,
  selected,
  currentPlan,
  checkoutAvailable = true,
}: {
  plans: PublicPlan[];
  onChoose: (plan: PublicPlan) => void;
  busy?: boolean;
  selected?: string | null;
  currentPlan?: string;
  checkoutAvailable?: boolean;
}) {
  return (
    <div className="pricing-grid">
      {plans.map((plan) => {
        const free = plan.priceCentavos === 0;
        const auto = plan.allowances?.find((item) => item.bucket === 'Auto');
        const current = currentPlan === plan.id;
        return (
          <article
            key={plan.id}
            className={`pricing-card ${selected === plan.id ? 'plan-selected' : ''}`}
          >
            <div className="plan-heading">
              <h3>{plan.name}</h3>
              {current && <span className="status-badge">Current plan</span>}
            </div>
            <p>{plan.description}</p>
            <div className="plan-price">
              <strong>
                {new Intl.NumberFormat('en', {
                  style: 'currency',
                  currency: plan.currency,
                  maximumFractionDigits: 2,
                }).format(plan.priceCentavos / 100)}
              </strong>
              <span>{free ? 'to get started' : plan.billingPeriod}</span>
            </div>
            <button
              className={free ? 'secondary-button' : 'primary-button'}
              onClick={() => onChoose(plan)}
              disabled={busy || (!free && (current || !checkoutAvailable))}
            >
              {busy && selected === plan.id
                ? 'Opening secure checkout…'
                : free
                  ? 'Start for Free'
                  : current
                    ? 'Plan active'
                    : !checkoutAvailable
                      ? 'Checkout unavailable'
                      : `Get ${plan.name}`}
              <Icon name="arrow" />
            </button>
            <ul className="plan-features">
              <li>
                <Icon name="check" />
                Private conversations and saved history
              </li>
              <li>
                <Icon name="check" />
                Auto — Recommended
              </li>
              {auto && (
                <li>
                  <Icon name="check" />
                  {auto.dailyLimit.toLocaleString()} Auto requests per day
                </li>
              )}
              {auto && (
                <li>
                  <Icon name="check" />
                  {auto.monthlyLimit.toLocaleString()} Auto requests per month
                </li>
              )}
              {plan.monthlyCredits !== undefined && (
                <li>
                  <Icon name="check" />
                  {plan.monthlyCredits.toLocaleString()} shared credits per
                  month
                </li>
              )}
              <li>
                <Icon name="check" />
                {plan.manualModelCount
                  ? `${plan.manualModelCount} models with manual selection`
                  : 'Automatic model selection'}
              </li>
              {plan.features.map((feature, index) => (
                <li key={`${feature.key}-${index}`}>
                  <Icon name="check" />
                  {feature.name}: {feature.limit ?? 'No set limit'} /{' '}
                  {feature.resetPeriod.toLowerCase()}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
