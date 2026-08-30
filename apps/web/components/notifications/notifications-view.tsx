'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api';
import type { NotificationsResponse } from '@/lib/api';

export function NotificationsView() {
  const { accessToken, isLoading } = useAuth();
  const [notifications, setNotifications] =
    useState<NotificationsResponse | null>(null);
  const [error, setError] = useState(false);

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
    await apiRequest(`/notifications/${id}/read`, {
      accessToken,
      method: 'PATCH',
    }).catch(() => undefined);
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
  }

  async function markAllRead() {
    if (!accessToken || !notifications) return;
    await apiRequest('/notifications/read-all', {
      accessToken,
      method: 'POST',
    }).catch(() => undefined);
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
      <Card className="relative overflow-hidden border-[#0D0D0D] bg-[#0D0D0D] text-white dark:border-white">
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="space-y-4">
            <Badge className="border-white/30 text-zinc-300">
              Notifications
            </Badge>
            <h1 className="text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">
              Useful signals, in one place.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-zinc-300">
              {notifications.unreadCount} unread notifications from the people
              and prompt repositories connected to your work.
            </p>
          </div>
          <Button onClick={() => void markAllRead()} variant="secondary">
            Mark all read
          </Button>
        </div>
      </Card>
      {notifications.items.length === 0 ? (
        <EmptyState
          description="Likes, comments, follows, and variants will appear here."
          title="No notifications yet"
        />
      ) : (
        <div className="grid gap-3">
          {notifications.items.map((item) => (
            <NotificationCard
              item={item}
              onRead={() => void markRead(item.id)}
              key={item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  item,
  onRead,
}: {
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
      <>created a Variant based on {repository || 'your prompt'}.</>
    );
  return (
    <Card className={item.readAt ? '' : 'border-black dark:border-white'}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm leading-7">
          {actor} {message}
        </p>
        {!item.readAt ? (
          <Button onClick={onRead} variant="ghost">
            Mark read
          </Button>
        ) : null}
      </div>
      <time
        className="mt-3 block text-xs text-zinc-500"
        dateTime={item.createdAt}
      >
        {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
          new Date(item.createdAt),
        )}
      </time>
    </Card>
  );
}
