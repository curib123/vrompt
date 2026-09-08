'use client';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useSubscription } from '@/components/providers/subscription-provider';

export function PlanBadge() {
  const { user } = useAuth();
  const { data, error, loading } = useSubscription();
  if (!user) return null;
  if (user.role === 'ADMIN') return <span className="plan-badge">Admin</span>;
  if (!data || loading)
    return (
      <Link className="plan-badge" href="/billing">
        {error ? 'Check plan' : 'Plan…'}
      </Link>
    );
  const code = data.planCode ?? data.plan;
  const name =
    data.planName ??
    { FREE: 'Free', STARTER: 'Starter', PRO: 'Pro', MAX: 'Max' }[code] ??
    code;
  return (
    <Link
      href="/billing"
      className="plan-badge"
      data-plan={code.toLowerCase()}
      aria-label={`Current plan: ${name}. View billing`}
    >
      {name}
    </Link>
  );
}
