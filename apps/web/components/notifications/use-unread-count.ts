'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest } from '@/lib/api';
import type { NotificationsResponse } from '@/lib/api';

export function useUnreadNotificationCount() {
  const { accessToken } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useEffectEvent(async () => {
    if (!accessToken) return;
    try {
      const response = await apiRequest<NotificationsResponse>(
        '/notifications?page=1&pageSize=1',
        { accessToken },
      );
      setCount(response.unreadCount);
    } catch {
      // Navigation stays usable when the notification service is unavailable.
    }
  });

  useEffect(() => {
    // Synchronize the navigation badge with the authenticated notification resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const handleUpdate = () => void refresh();
    window.addEventListener('vrompt:notifications-updated', handleUpdate);
    return () =>
      window.removeEventListener('vrompt:notifications-updated', handleUpdate);
  }, [accessToken]);

  return count;
}
