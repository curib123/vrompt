'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  apiRequest,
  type Conversation,
  type SavedPrompt,
  type Usage,
  type Model,
} from '@/lib/api';
import { useTheme } from '@/components/theme/theme-provider';

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
export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  return (
    <div className="content-page">
      <h1>Settings</h1>
      <section className="panel">
        <h2>Your account</h2>
        <p>{user?.email}</p>
        <p className="muted">
          Sign-in is managed through your connected Google or GitHub account.
        </p>
      </section>
      <section className="panel">
        <label>
          Appearance{' '}
          <select
            value={theme}
            onChange={(e) =>
              setTheme(e.target.value as 'system' | 'light' | 'dark')
            }
          >
            <option value="system">Use device setting</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>
    </div>
  );
}

export function AdminOverview() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Record<string, unknown>>();
  useEffect(() => {
    if (accessToken)
      void apiRequest<Record<string, unknown>>('/admin/dashboard', {
        accessToken,
      })
        .then(setData)
        .catch(() => {});
  }, [accessToken]);
  return (
    <div className="content-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Workspace operations</h1>
      <p className="muted">
        Configure models and allowances, then monitor provider cost, reliability
        and revenue.
      </p>
      <section className="feature-grid">
        <div className="panel">
          <h2>{String(data?.users ?? '—')}</h2>
          <p className="muted">Active users</p>
        </div>
        <div className="panel">
          <h2>{String(data?.generations ?? '—')}</h2>
          <p className="muted">Recorded generations</p>
        </div>
        <div className="panel">
          <h2>{String(data?.models ?? '—')}</h2>
          <p className="muted">Enabled models</p>
        </div>
      </section>
      <p>
        <Link className="primary-button" href="/admin/models">
          Configure models and routing
        </Link>
      </p>
    </div>
  );
}
export function AdminConfiguration() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<{
    models: Model[];
    plans: { id: string; name: string }[];
    policies: {
      id: string;
      bucket: string;
      dailyLimit: number;
      monthlyLimit: number;
    }[];
  }>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (accessToken)
      void apiRequest<typeof data>('/admin/workspace/configuration', {
        accessToken,
      })
        .then(setData)
        .catch((e) => setError(e.message));
  }, [accessToken]);
  return (
    <div className="content-page">
      <h1>Models & routing</h1>
      <p className="muted">
        Models are disabled until provider credentials, prices, capabilities and
        plan policies are configured.
      </p>
      {error && <p className="error-banner">{error}</p>}
      <section className="panel">
        <h2>Model registry</h2>
        {data?.models.map((m) => (
          <div className="row" key={m.id}>
            <span>
              <strong>{m.displayName}</strong>
              <br />
              <small>
                {m.provider} · {m.capabilities.join(', ')}
              </small>
            </span>
            <span>
              {m.enabled ? 'Enabled' : 'Disabled'}
              {m.maintenance ? ' · Maintenance' : ''}
            </span>
          </div>
        ))}
        {!data?.models.length && (
          <p className="muted">No model is configured yet.</p>
        )}
      </section>
      <section className="panel">
        <h2>Allowance policies</h2>
        {data?.policies.map((p) => (
          <div className="row" key={p.id}>
            <span>{p.bucket}</span>
            <span>
              {p.dailyLimit}/day · {p.monthlyLimit}/month
            </span>
          </div>
        ))}
      </section>
      <p className="muted">
        Use the protected admin API to add or edit registry entries. Changes are
        audit logged.
      </p>
    </div>
  );
}
export function AdminAnalytics() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<{
    costs: {
      provider: string;
      modelName: string;
      _sum: { estimatedCost: string | null };
      _count: number;
    }[];
    activeSubscriptions: number;
    note: string;
  }>();
  useEffect(() => {
    if (accessToken)
      void apiRequest<typeof data>('/admin/workspace/analytics', {
        accessToken,
      })
        .then(setData)
        .catch(() => {});
  }, [accessToken]);
  return (
    <div className="content-page">
      <h1>Costs & revenue</h1>
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
            <span>{c._sum.estimatedCost ?? '0'} cost units</span>
          </div>
        ))}
      </section>
      <p className="muted">{data?.note}</p>
    </div>
  );
}

type Plan = {
  id: string;
  name: string;
  description: string;
  priceCentavos: number;
  currency: string;
  billingPeriod: string;
  features: { key: string; name: string; limit: number; resetPeriod: string }[];
};
type Billing = {
  plan: string;
  subscription: { id: string; status: string; currentPeriodEnd: string } | null;
  latestPayment: { status: string; amount: number; currency: string } | null;
};
export function BillingPage({ pricing = false }: { pricing?: boolean }) {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<Billing>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  useEffect(() => {
    void apiRequest<{ plans: Plan[] }>('/billing/plans')
      .then((r) => setPlans(r.plans))
      .catch((e) => setError(e.message));
    if (accessToken)
      void apiRequest<Billing>('/billing/me', { accessToken })
        .then(setBilling)
        .catch((e) => setError(e.message));
  }, [accessToken]);
  async function checkout(planCode: string) {
    if (!accessToken) {
      window.location.assign('/login');
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
            planCode,
            ...(code ? { discountCode: code } : {}),
          }),
        },
      );
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="content-page">
      {pricing && <Link href="/">← Vrompt</Link>}
      <h1>
        {pricing
          ? 'One subscription. More possibilities.'
          : 'Subscription / Billing'}
      </h1>
      <p className="muted">
        Clear daily and monthly generation allowances. Choose the capacity that
        fits your work.
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {billing && (
        <section className="panel">
          <h2>Current plan: {billing.plan}</h2>
          {billing.subscription && (
            <p>
              Access status: {billing.subscription.status} · Ends{' '}
              {new Date(
                billing.subscription.currentPeriodEnd,
              ).toLocaleDateString()}
            </p>
          )}
          <p className="muted">
            Access passes are renewed by checkout. Your card is not
            automatically charged.
          </p>
          {billing.latestPayment && (
            <p>
              Latest payment: {billing.latestPayment.currency}{' '}
              {(billing.latestPayment.amount / 100).toFixed(2)} ·{' '}
              {billing.latestPayment.status}
            </p>
          )}
        </section>
      )}
      <label>
        Promotion code{' '}
        <input
          value={code}
          maxLength={64}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      {plans.map((p) => (
        <section className="panel" key={p.id}>
          <h2>{p.name}</h2>
          <p className="muted">{p.description}</p>
          <p>
            <strong>
              {p.currency} {(p.priceCentavos / 100).toFixed(2)}
            </strong>{' '}
            · {p.billingPeriod}
          </p>
          {p.features.map((f, i) => (
            <p key={`${f.key}-${i}`} className="muted">
              {f.name}: {f.limit} / {f.resetPeriod.toLowerCase()}
            </p>
          ))}
          <button
            className="primary-button"
            disabled={busy || p.priceCentavos === 0}
            onClick={() => void checkout(p.id)}
          >
            {p.priceCentavos ? 'Get access' : 'Free plan'}
          </button>
        </section>
      ))}
      {!plans.length && !error && (
        <p className="panel">
          Plans are being configured. Please check back shortly.
        </p>
      )}
    </div>
  );
}
