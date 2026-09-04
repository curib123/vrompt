'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/api';
import type { AdminSystemResponse } from '@/lib/api';

export function SystemAdmin() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<AdminSystemResponse | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (accessToken)
      void apiRequest<AdminSystemResponse>('/admin/system', {
        accessToken,
      }).then(setData);
  }, [accessToken, revision]);
  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-mid">
              Operational visibility
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
              System health
            </h1>
            <p className="mt-3 text-sm text-brand-mid">
              Safe diagnostics only—credentials and personal data are never
              shown.
            </p>
          </div>
          <Button onClick={() => setRevision((v) => v + 1)} variant="secondary">
            Run checks
          </Button>
        </div>
      </Card>
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Status
              label="Database"
              ok={data.dependencies.database.status === 'up'}
              detail={`${data.dependencies.database.latencyMs} ms`}
            />
            <Status
              label="Redis"
              ok={data.dependencies.redis.status === 'up'}
            />
            <Status label="Google OAuth" ok={data.integrations.googleOAuth} />
            <Status label="GitHub OAuth" ok={data.integrations.githubOAuth} />
            <ExternalStatus
              label="Oracle server"
              check={data.dependencies.oracleServer}
            />
            <ExternalStatus
              label="Production domain"
              check={data.dependencies.domain}
            />
          </div>
          <Card className="grid gap-4 sm:grid-cols-3">
            <Metric
              label="Uptime"
              value={`${Math.floor(data.uptimeSeconds / 60)} min`}
            />
            <Metric
              label="Requests"
              value={String(data.metrics.requests.total)}
            />
            <Metric
              label="Average latency"
              value={`${data.metrics.requests.averageLatencyMs} ms`}
            />
            <Metric
              label="Server errors"
              value={String(data.metrics.requests.responses5xx)}
            />
            <Metric
              label="Failed logins"
              value={String(data.metrics.requests.failedLogins)}
            />
            <Metric
              label="Storage errors"
              value={String(data.metrics.evidence.storageErrors)}
            />
          </Card>
          <p className="text-xs text-brand-mid">
            Last checked {new Date(data.checkedAt).toLocaleString()} ·{' '}
            {data.environment} · {data.runtime}
          </p>
        </>
      ) : (
        <Card>
          <p className="text-sm text-brand-mid">Running system checks…</p>
        </Card>
      )}
    </div>
  );
}
function ExternalStatus({
  label,
  check,
}: {
  label: string;
  check: {
    status: 'up' | 'down' | 'not_configured';
    latencyMs: number | null;
  };
}) {
  const ok = check.status === 'up';
  const message =
    check.status === 'not_configured'
      ? 'Needs configuration'
      : ok
        ? 'Available'
        : 'Unavailable';
  return (
    <Card>
      <span
        className={`inline-block size-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      <p className="mt-4 font-semibold">{label}</p>
      <p className="mt-1 text-xs text-brand-mid">
        {message}
        {check.latencyMs !== null ? ` · ${check.latencyMs} ms` : ''}
      </p>
    </Card>
  );
}
function Status({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <Card>
      <span
        className={`inline-block size-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      <p className="mt-4 font-semibold">{label}</p>
      <p className="mt-1 text-xs text-brand-mid">
        {ok ? 'Available' : 'Needs configuration'}
        {detail ? ` · ${detail}` : ''}
      </p>
    </Card>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-brand-mid">
        {label}
      </p>
    </div>
  );
}
