'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { AuditResponse } from '@/lib/api';

export function AuditView() {
  const { accessToken, isLoading, user } = useAuth();
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actor, setActor] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (
      isLoading ||
      !accessToken ||
      !user ||
      !['ADMIN', 'MODERATOR'].includes(user.role)
    )
      return;
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: '30' });
    if (action) params.set('action', action);
    if (targetType) params.set('targetType', targetType);
    if (actor) params.set('actor', actor);
    void apiRequest<AuditResponse>(`/admin/audit?${params.toString()}`, {
      accessToken,
    })
      .then((response) => {
        if (active) setAudit(response);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessToken, action, actor, isLoading, page, targetType, user]);

  if (user && !['ADMIN', 'MODERATOR'].includes(user.role))
    return (
      <EmptyState
        actionHref="/"
        actionLabel="Return home"
        description="This area is restricted to moderators and administrators."
        title="Audit access required"
      />
    );
  if (!audit)
    return (
      <Card>
        <p className="text-sm text-zinc-500">Loading audit log...</p>
      </Card>
    );

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="relative space-y-4">
          <Badge className="border-white/30 text-zinc-300">Admin / Audit</Badge>
          <h1 className="text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">
            The record stays readable.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-zinc-300">
            Immutable administrative history for accountability and review.
          </p>
        </div>
      </Card>
      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            aria-label="Filter by actor"
            onChange={(event) => {
              setActor(event.target.value);
              setPage(1);
            }}
            placeholder="Actor username"
            value={actor}
          />
          <select
            aria-label="Filter by action"
            className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            value={action}
          >
            <option value="">All actions</option>
            <option value="PROMPT_HIDDEN">Prompt hidden</option>
            <option value="PROMPT_RESTORED">Prompt restored</option>
            <option value="COMMENT_HIDDEN">Comment hidden</option>
            <option value="USER_SUSPENDED">User suspended</option>
            <option value="USER_RESTORED">User restored</option>
            <option value="REPORT_RESOLVED">Report resolved</option>
          </select>
          <select
            aria-label="Filter by target"
            className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onChange={(event) => {
              setTargetType(event.target.value);
              setPage(1);
            }}
            value={targetType}
          >
            <option value="">All targets</option>
            <option value="REPOSITORY">Repository</option>
            <option value="COMMENT">Comment</option>
            <option value="USER">User</option>
            <option value="REPORT">Report</option>
          </select>
        </div>
      </Card>
      {audit.items.length === 0 ? (
        <EmptyState
          description="No audit entries match these filters."
          title="No audit events"
        />
      ) : (
        <div className="grid gap-3">
          {audit.items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge>{item.action}</Badge>
                  <p className="mt-3 text-sm">
                    @{item.actor?.username || 'system'} changed{' '}
                    {item.targetType.toLowerCase()} {item.targetId || 'record'}.
                  </p>
                </div>
                <time
                  className="text-xs text-zinc-500"
                  dateTime={item.createdAt}
                >
                  {new Intl.DateTimeFormat('en', {
                    dateStyle: 'medium',
                  }).format(new Date(item.createdAt))}
                </time>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          disabled={audit.page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          variant="secondary"
        >
          Previous
        </Button>
        <Button
          disabled={!audit.hasNextPage}
          onClick={() => setPage((current) => current + 1)}
          variant="secondary"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
