'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest } from '@/lib/api';

export function useAdminResource<T>(path: string) {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!accessToken || user?.role !== 'ADMIN') return;
    const controller = new AbortController();
    // Reset request state when subscribing to a different protected resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    void apiRequest<T>(path, { accessToken, signal: controller.signal })
      .then(setData)
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, accessToken, user?.role, revision]);
  return { data, loading, error, refresh, accessToken };
}
