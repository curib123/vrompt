'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { apiRequest } from '@/lib/api';
import type { ModerationReport } from '@/lib/api';

export function ModerationView() {
  const { accessToken, isLoading, user } = useAuth();
  const [reports, setReports] = useState<ModerationReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      isLoading ||
      !accessToken ||
      !user ||
      !['ADMIN', 'MODERATOR'].includes(user.role)
    )
      return;
    let active = true;
    void apiRequest<ModerationReport[]>('/admin/moderation/reports', {
      accessToken,
    })
      .then((response) => {
        if (active) setReports(response);
      })
      .catch(() => {
        if (active) setError('Moderation queue could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [accessToken, isLoading, user]);

  if (user && !['ADMIN', 'MODERATOR'].includes(user.role)) {
    return (
      <EmptyState
        actionHref="/"
        actionLabel="Return home"
        description="This area is restricted to moderators and administrators."
        title="Moderation access required"
      />
    );
  }
  if (!reports)
    return error ? (
      <EmptyState description={error} title="Moderation unavailable" />
    ) : (
      <Card>
        <p className="text-sm text-zinc-500">Loading moderation queue...</p>
      </Card>
    );

  async function resolve(reportId: string, action: 'DISMISS' | 'RESOLVE') {
    if (!accessToken) return;
    await apiRequest(`/admin/moderation/reports/${reportId}`, {
      accessToken,
      body: JSON.stringify({ action }),
      method: 'PATCH',
    });
    setReports(
      (current) => current?.filter((report) => report.id !== reportId) ?? null,
    );
  }

  async function moderate(
    report: ModerationReport,
    action: 'HIDE' | 'RESTORE' | 'SUSPEND',
  ) {
    if (!accessToken) return;
    const segment =
      report.targetType === 'REPOSITORY'
        ? 'repositories'
        : report.targetType === 'COMMENT'
          ? 'comments'
          : 'users';
    await apiRequest(`/admin/moderation/${segment}/${report.targetId}`, {
      accessToken,
      body: JSON.stringify({ action }),
      method: 'PATCH',
    });
    setReports(
      (current) => current?.filter((item) => item.id !== report.id) ?? null,
    );
  }

  return (
    <div className="grid gap-8">
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="relative space-y-4">
          <Badge className="border-white/30 text-zinc-300">
            Admin / Moderation
          </Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.07em] sm:text-7xl">
            Review before you remove.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-zinc-300">
            Open reports are evidence for careful decisions, not automatic
            takedowns.
          </p>
        </div>
      </Card>
      {reports.length === 0 ? (
        <EmptyState
          description="New reports will appear here for review."
          title="Queue is clear"
        />
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{report.targetType}</Badge>
                    <Badge>{report.reason}</Badge>
                  </div>
                  <p className="text-sm leading-7">
                    Reported by @{report.reporter.username}
                    {report.description ? `: ${report.description}` : '.'}
                  </p>
                  <p className="font-mono text-xs text-zinc-500">
                    Target {report.targetId}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void resolve(report.id, 'DISMISS')}
                    variant="ghost"
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={() => void resolve(report.id, 'RESOLVE')}
                    variant="secondary"
                  >
                    Resolve
                  </Button>
                  {report.targetType === 'USER' ? (
                    <Button
                      onClick={() => void moderate(report, 'SUSPEND')}
                      variant="secondary"
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void moderate(report, 'HIDE')}
                      variant="secondary"
                    >
                      Hide
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
