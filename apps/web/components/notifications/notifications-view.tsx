'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type { NotificationsResponse } from '@/lib/api';
import { PageHeader } from '@/components/ui/page';
import { useToast } from '@/components/ui/toast';

export function NotificationsView() {
  const { accessToken, isLoading } = useAuth();
  const [notifications, setNotifications] =
    useState<NotificationsResponse | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    if (isLoading || !accessToken) return;
    let active = true;
    void apiRequest<NotificationsResponse>(
      '/notifications?page=1&pageSize=30',
      { accessToken },
    )
      .then((response) => {
        if (active) setNotifications(response);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [accessToken, isLoading]);

  async function markRead(id: string) {
    if (!accessToken || !notifications) return;
    setBusyId(id);
    try {
      await apiRequest(`/notifications/${id}/read`, {
        accessToken,
        method: 'PATCH',
      });
    } catch {
      pushToast({
        title: 'Could not mark notification as read',
        description: 'Please try again.',
      });
      setBusyId(null);
      return;
    }
    setNotifications((current) =>
      current
        ? {
            ...current,
            unreadCount: Math.max(current.unreadCount - 1, 0),
            items: current.items.map((item) =>
              item.id === id
                ? { ...item, readAt: new Date().toISOString() }
                : item,
            ),
          }
        : current,
    );
    setBusyId(null);
    window.dispatchEvent(new Event('vrompt:notifications-updated'));
  }

  async function markAllRead() {
    if (!accessToken || !notifications) return;
    setBusyId('all');
    try {
      await apiRequest('/notifications/read-all', {
        accessToken,
        method: 'POST',
      });
    } catch {
      pushToast({
        title: 'Notifications were not updated',
        description: 'Please try again.',
      });
      setBusyId(null);
      return;
    }
    setNotifications((current) =>
      current
        ? {
            ...current,
            unreadCount: 0,
            items: current.items.map((item) => ({
              ...item,
              readAt: item.readAt || new Date().toISOString(),
            })),
          }
        : current,
    );
    setBusyId(null);
    pushToast({ title: 'All notifications marked as read' });
    window.dispatchEvent(new Event('vrompt:notifications-updated'));
  }

  if (!notifications) {
    return error ? (
      <EmptyState
        description="Notifications are unavailable right now."
        title="Notification center unavailable"
      />
    ) : (
      <Skeleton className="h-96 rounded-[1.5rem]" />
    );
  }

  return (
    <div className="grid gap-8">
      <PageHeader
        action={
          <Button
            disabled={notifications.unreadCount === 0 || Boolean(busyId)}
            onClick={() => void markAllRead()}
            variant="secondary"
          >
            {busyId === 'all' ? 'Marking read…' : 'Mark all read'}
          </Button>
        }
        description={`${notifications.unreadCount} unread notifications from the people and prompts connected to your work.`}
        eyebrow="Activity"
        title="Notifications"
      />
      {notifications.items.length === 0 ? (
        <EmptyState
          description="Likes, comments, follows, and variations will appear here."
          title="No notifications yet"
        />
      ) : (
        <div className="grid gap-7">
          {groupNotifications(notifications.items).map(([label, items]) => (
            <section
              className="grid gap-3"
              key={label}
              aria-labelledby={`notifications-${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              <h2
                className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-mid"
                id={`notifications-${label.toLowerCase().replaceAll(' ', '-')}`}
              >
                {label}
              </h2>
              {items.map((item) => (
                <NotificationCard
                  item={item}
                  busy={busyId === item.id}
                  onRead={() => void markRead(item.id)}
                  key={item.id}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupNotifications(items: NotificationsResponse['items']) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 7);
  const groups = new Map<string, NotificationsResponse['items']>([
    ['Today', []],
    ['Earlier this week', []],
    ['Older', []],
  ]);
  for (const item of items) {
    const createdAt = new Date(item.createdAt);
    const label =
      createdAt >= startOfToday
        ? 'Today'
        : createdAt >= startOfWeek
          ? 'Earlier this week'
          : 'Older';
    groups.get(label)?.push(item);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 0);
}

function NotificationCard({
  busy,
  item,
  onRead,
}: {
  busy: boolean;
  item: NotificationsResponse['items'][number];
  onRead: () => void;
}) {
  const actor = item.actor ? (
    <Link
      className="font-mono font-semibold underline"
      href={`/u/${item.actor.username}`}
    >
      @{item.actor.username}
    </Link>
  ) : (
    'Someone'
  );
  const repository = item.promptRepository ? (
    <Link
      className="font-semibold underline"
      href={`/p/${item.promptRepository.slug}`}
    >
      {item.promptRepository.title}
    </Link>
  ) : null;
  const message =
    item.type === 'NEW_FOLLOWER' ? (
      'started following you.'
    ) : item.type === 'PROMPT_LIKED' ? (
      <>liked {repository || 'your prompt'}.</>
    ) : item.type === 'PROMPT_COMMENTED' ? (
      <>commented on {repository || 'your prompt'}.</>
    ) : item.type === 'COMMENT_REPLIED' ? (
      <>replied to a comment on {repository || 'your prompt'}.</>
    ) : (
      <>created a variation based on {repository || 'your prompt'}.</>
    );
  return (
    <Card className={item.readAt ? '' : 'border-black dark:border-white'}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-7">
          {actor} {message}
        </p>
        {!item.readAt ? (
          <Button disabled={busy} onClick={onRead} variant="ghost">
            {busy ? 'Marking…' : 'Mark read'}
          </Button>
        ) : null}
      </div>
      <time
        className="mt-3 block text-xs text-zinc-600 dark:text-zinc-400"
        dateTime={item.createdAt}
      >
        {new Intl.DateTimeFormat('en', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(item.createdAt))}
      </time>
    </Card>
  );
}
