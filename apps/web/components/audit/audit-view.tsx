'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { AuditResponse } from '@/lib/api';
import {
  AdminLoading,
  AdminNotice,
  AdminPageHeader,
  AdminPagination,
} from '@/components/admin/admin-ui';

export function AuditView() {
  const { accessToken, isLoading, user } = useAuth();
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actor, setActor] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

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
        if (active) {
          setAudit(response);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Audit events could not be loaded.');
      });
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
    return error ? (
      <AdminNotice tone="error">{error}</AdminNotice>
    ) : (
      <AdminLoading label="Loading audit log" />
    );

  return (
    <div className="grid gap-8">
      <AdminPageHeader
        eyebrow="Accountability"
        title="Audit log"
        description="A clear record of important changes for accountability and review."
      />
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
            <option value="AUDIENCE_CREATED">Audience created</option>
            <option value="AUDIENCE_UPDATED">Audience updated</option>
            <option value="AUDIENCE_ACTIVATED">Audience activated</option>
            <option value="AUDIENCE_DEACTIVATED">Audience deactivated</option>
            <option value="AUDIENCE_REORDERED">Audience reordered</option>
            <option value="SETTING_UPDATED">Setting updated</option>
            <option value="SETTING_RESET">Setting reset</option>
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
            <option value="REPOSITORY">Prompt</option>
            <option value="COMMENT">Comment</option>
            <option value="USER">User</option>
            <option value="REPORT">Report</option>
            <option value="AUDIENCE">Audience</option>
            <option value="SETTING">Setting</option>
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
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                  dateTime={item.createdAt}
                >
                  {new Intl.DateTimeFormat('en', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(item.createdAt))}
                </time>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AdminPagination
        hasNextPage={audit.hasNextPage}
        onPageChange={setPage}
        page={audit.page}
      />
    </div>
  );
}
