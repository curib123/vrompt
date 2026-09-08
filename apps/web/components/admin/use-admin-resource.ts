'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest } from '@/lib/api';

export function useAdminResource<T>(path: string | null) {
  const { accessToken, user } = useAuth();
  const [result, setResult] = useState<{
    path: string;
    token: string;
    data: T;
  }>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!path || !accessToken || user?.role !== 'ADMIN') return;
    const controller = new AbortController();
    // Reset request state when subscribing to a different protected resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    void apiRequest<T>(path, { accessToken, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ path, token: accessToken, data });
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, accessToken, user?.role, revision]);
  const data =
    result?.path === path && result?.token === accessToken
      ? result.data
      : undefined;
  return {
    data,
    loading: Boolean(path) && loading,
    error,
    refresh,
    accessToken,
  };
}
