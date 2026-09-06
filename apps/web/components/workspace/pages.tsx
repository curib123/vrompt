'use client';
import { Icon } from '@/components/ui/icon';
import { Suspense } from 'react';
import {
  PlanCards,
  usePlans,
  type PublicPlan,
} from '@/components/billing/plan-cards';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useAuthDialog } from '@/components/providers/auth-dialog-provider';
import {
  apiRequest,
  type Conversation,
  type SavedPrompt,
  type Usage,
  type Model,
} from '@/lib/api';

export function Conversations() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void apiRequest<Conversation[]>(
        `/workspace/conversations?q=${encodeURIComponent(query)}`,
        { accessToken, signal: controller.signal },
      )
        .then(setItems)
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, query]);
  async function change(c: Conversation, remove = false) {
    const title = remove ? null : window.prompt('Conversation name', c.title);
    if (
      remove
        ? !window.confirm('Delete this conversation and its files?')
        : !title?.trim()
    )
      return;
    try {
      await apiRequest(`/workspace/conversations/${c.id}`, {
        accessToken: accessToken!,
        method: remove ? 'DELETE' : 'PATCH',
        ...(remove ? {} : { body: JSON.stringify({ title }) }),
      });
      setItems((old) =>
        remove
          ? old.filter((x) => x.id !== c.id)
          : old.map((x) => (x.id === c.id ? { ...x, title: title! } : x)),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="content-page">
      <h1>Conversations</h1>
      <p className="muted">Pick up where you left off.</p>
      <input
        aria-label="Search conversations"
        placeholder="Search conversations"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="panel">
        {items.map((c) => (
          <div className="row" key={c.id}>
            <Link href={`/chat?id=${c.id}`}>{c.title}</Link>
            <div className="row-actions">
              <button onClick={() => void change(c)}>Rename</button>
              <button onClick={() => void change(c, true)}>Delete</button>
            </div>
          </div>
        ))}
        {!items.length && (
          <p className="muted">
            No conversations found. <Link href="/chat">Start a new chat.</Link>
          </p>
        )}
      </div>
    </div>
  );
}
export function SavedPrompts() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<SavedPrompt[]>([]);
  const [editing, setEditing] = useState<string>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  async function load() {
    setItems(
      await apiRequest<SavedPrompt[]>('/workspace/saved-prompts', {
        accessToken: accessToken!,
      }),
    );
  }
  useEffect(() => {
    // Hydrate saved prompts from the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (accessToken) void load().catch((e) => setError(e.message));
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiRequest(
        `/workspace/saved-prompts${editing ? `/${editing}` : ''}`,
        {
          accessToken: accessToken!,
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify({ title, content }),
        },
      );
      setTitle('');
      setContent('');
      setEditing(undefined);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="content-page">
      <h1>Saved Prompts</h1>
      <p className="muted">
        Keep reusable instructions handy. Only you can see these.
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <section className="panel">
        <form onSubmit={save}>
          <label>
            Name
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Instructions
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <button className="primary-button">
            {editing ? 'Save changes' : 'Save prompt'}
          </button>
        </form>
      </section>
      {items.map((p) => (
        <section className="panel" key={p.id}>
          <h2>{p.title}</h2>
          <p className="muted">{p.content.slice(0, 240)}</p>
          <div className="row-actions">
            <button
              onClick={() => {
                sessionStorage.setItem('vrompt-insert-prompt', p.content);
                router.push('/chat');
              }}
            >
              Insert into chat
            </button>
            <button
              onClick={() => {
                setEditing(p.id);
                setTitle(p.title);
                setContent(p.content);
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this saved prompt?'))
                  void apiRequest(`/workspace/saved-prompts/${p.id}`, {
                    accessToken: accessToken!,
                    method: 'DELETE',
                  })
                    .then(load)
                    .catch((e) => setError(e.message));
              }}
            >
              Delete
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
export function UsagePage() {
  const { accessToken } = useAuth();
  const [usage, setUsage] = useState<Usage>();
  const [models, setModels] = useState<Model[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      apiRequest<Usage>('/workspace/usage', { accessToken }),
      apiRequest<Model[]>('/workspace/models', { accessToken }),
    ])
      .then(([u, m]) => {
        setUsage(u);
        setModels(m);
      })
      .catch((e) => setError(e.message));
  }, [accessToken]);
  return (
    <div className="content-page">
      <h1>Your usage</h1>
      {usage?.credits && (
        <p>
          {usage.credits.remaining} / {usage.credits.limit} monthly credits
          remaining
        </p>
      )}
      <p className="muted">
        All models share monthly credits. Daily and monthly generation limits
        also apply.
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {usage?.allowances.map((a) => (
        <section className="panel" key={a.bucket}>
          <h2>
            {a.bucket === 'AUTO'
              ? 'Auto'
              : (models.find((m) => m.id === a.bucket)?.displayName ??
                'Model allowance')}
          </h2>
          <div className="row">
            <span>Today</span>
            <strong>
              {a.dailyRemaining} / {a.dailyLimit} remaining
            </strong>
          </div>
          <div className="row">
            <span>This month</span>
            <strong>
              {a.monthlyRemaining} / {a.monthlyLimit} remaining
            </strong>
          </div>
          <p className="muted">
            Up to {a.maxFiles} files · {Math.round(a.maxFileBytes / 1000000)} MB
            per file
          </p>
        </section>
      ))}
      {usage && (
        <p className="muted">
          Daily reset: {new Date(usage.resets.daily).toLocaleString()}
          <br />
          Monthly reset: {new Date(usage.resets.monthly).toLocaleString()}
          <br />
          Both allowances must remain available. A stopped response may count
          when processing has already occurred.
        </p>
      )}
      <Link href="/billing" className="primary-button">
        Manage subscription & extra usage
      </Link>
    </div>
  );
}
export function AdminAnalytics() {
  const { accessToken } = useAuth();
  const [error, setError] = useState('');
  const [data, setData] = useState<{
    costs: {
      provider: string;
      modelName: string;
      currency: string;
      _sum: { estimatedCost: string | null };
      _count: number;
    }[];
    activeSubscriptions: number;
    contribution: {
      currency: string;
      revenue: number;
      aiCost: number;
      contributionProfit: number;
      margin: number | null;
    }[];
    note: string;
  }>();
  useEffect(() => {
    if (accessToken)
      void apiRequest<typeof data>('/admin/workspace/analytics', {
        accessToken,
      })
        .then(setData)
        .catch((e: Error) => setError(e.message));
  }, [accessToken]);
  return (
    <div className="content-page">
      <h1>Costs & revenue</h1>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="feature-grid">
        {data?.contribution.map((item) => (
          <section className="panel" key={item.currency}>
            <p className="eyebrow">{item.currency} · Last 30 days</p>
            <h2>{item.revenue.toFixed(2)}</h2>
            <p className="muted">Cash received</p>
            <div className="row">
              <span>AI cost</span>
              <strong>{item.aiCost.toFixed(4)}</strong>
            </div>
            <div className="row">
              <span>Contribution</span>
              <strong>{item.contributionProfit.toFixed(2)}</strong>
            </div>
            <p className="muted">
              {item.margin === null
                ? 'No revenue recorded'
                : `${(item.margin * 100).toFixed(1)}% contribution margin`}
            </p>
          </section>
        ))}
      </div>
      <p className="muted">
        Last 30 days. Provider costs are tracked separately from customer-facing
        generations.
      </p>
      <section className="panel">
        <div className="row">
          <strong>Active subscriptions</strong>
          <span>{data?.activeSubscriptions ?? '—'}</span>
        </div>
        {data?.costs.map((c, i) => (
          <div className="row" key={`${c.provider}-${c.modelName}-${i}`}>
            <span>
              {c.provider} · {c.modelName}
              <br />
              <small>{c._count} records</small>
            </span>
            <span>
              {c.currency} {Number(c._sum.estimatedCost ?? 0).toFixed(4)}
            </span>
          </div>
        ))}
      </section>
      <p className="muted">{data?.note}</p>
    </div>
  );
}

type Billing = {
  plan: string;
  planCode?: string;
  planName?: string;
  subscription: { id: string; status: string; currentPeriodEnd: string } | null;
  latestPayment: { status: string; amount: number; currency: string } | null;
};
export function BillingPage() {
  return (
    <Suspense
      fallback={
        <p className="content-page" role="status">
          Loading billing…
        </p>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
function BillingContent() {
  const { openLogin } = useAuthDialog();
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const requestedPlan = useSearchParams().get('plan');
  const plans = usePlans();
  const [billing, setBilling] = useState<Billing>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(requestedPlan);
  const [code, setCode] = useState('');
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void apiRequest<Billing>('/billing/me', {
      accessToken,
      signal: controller.signal,
    })
      .then(setBilling)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [accessToken]);
  async function checkout(plan: PublicPlan) {
    if (!plan.priceCentavos) {
      if (user) router.push('/chat');
      else openLogin('/chat');
      return;
    }
    if (!accessToken) {
      openLogin('/billing?plan=' + encodeURIComponent(plan.id));
      return;
    }
    setSelected(plan.id);
    if (plans.data?.checkoutAvailable === false) {
      setError(
        'Paid checkout is temporarily unavailable. You can continue using your free workspace.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ checkoutUrl: string }>(
        '/billing/checkout',
        {
          accessToken,
          method: 'POST',
          headers: { 'idempotency-key': crypto.randomUUID() },
          body: JSON.stringify({
            planCode: plan.id,
            ...(code.trim() ? { discountCode: code.trim() } : {}),
          }),
        },
      );
      const url = new URL(result.checkoutUrl);
      if (
        url.protocol !== 'https:' ||
        !(
          url.hostname === 'paymongo.com' ||
          url.hostname.endsWith('.paymongo.com')
        )
      )
        throw new Error(
          'The checkout link could not be verified. Please retry.',
        );
      window.location.assign(url.href);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="content-page billing-content">
      <p className="eyebrow">YOUR PLAN, YOUR PACE</p>
      <h1>Make room for more.</h1>
      <p className="muted">One account. One plan. More ways to work with AI.</p>
      {billing && (
        <section className="panel current-plan-panel">
          <div>
            <span className="eyebrow">CURRENT PLAN</span>
            <h2>{billing.planName ?? billing.plan}</h2>
          </div>
          <div>
            {billing.subscription && (
              <p>
                {billing.subscription.status} · Access ends{' '}
                {new Date(
                  billing.subscription.currentPeriodEnd,
                ).toLocaleDateString()}
              </p>
            )}
            <Link href="/usage" className="text-link">
              View your usage <Icon name="arrow" />
            </Link>
          </div>
        </section>
      )}
      {plans.data?.checkoutAvailable === false && (
        <div className="service-notice" role="status">
          <Icon name="card" />
          <div>
            <strong>Paid checkout is temporarily unavailable.</strong>
            <p>
              Your free workspace remains available. No payment will be taken.
            </p>
            <Link href="/chat" className="text-link">
              Continue to chat <Icon name="arrow" />
            </Link>
          </div>
        </div>
      )}
      {plans.data?.checkoutAvailable && plans.data.paymentMode === 'test' && (
        <p className="notice-banner">
          Test payment mode. Checkout will not make a real charge.
        </p>
      )}
      {(error || plans.error) && (
        <p className="error-banner" role="alert">
          {error || plans.error}
        </p>
      )}
      {plans.error && (
        <button className="secondary-button" onClick={plans.retry}>
          Reload plans
        </button>
      )}
      {plans.data?.checkoutAvailable && (
        <label className="promotion-field">
          Promotion code (optional)
          <input
            value={code}
            maxLength={64}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code"
          />
        </label>
      )}
      {plans.data ? (
        <PlanCards
          plans={plans.data.plans}
          onChoose={(plan) => void checkout(plan)}
          busy={busy}
          selected={selected}
          currentPlan={billing?.planCode ?? billing?.plan}
          checkoutAvailable={plans.data.checkoutAvailable}
        />
      ) : (
        !plans.error && <p role="status">Loading current plans…</p>
      )}
      {plans.data && !plans.data.plans.length && (
        <div className="service-notice">
          <p>Paid plans are currently unavailable.</p>
          <Link href="/chat" className="primary-button">
            Open your free workspace
          </Link>
        </div>
      )}
      <p className="pricing-footnote">
        Paid access is renewed by checkout. Your card is not automatically
        charged. Shared credits and individual model limits both apply.
      </p>
    </div>
  );
}
