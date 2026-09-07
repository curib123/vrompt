'use client';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest } from '@/lib/api';

export function useWorkspaceResource<T>(path: string, delay = 0) {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<{
    path: string;
    token: string;
    data?: T;
    error?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    // A request subscription resets its loading state before reading the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const timer = setTimeout(() => {
      void apiRequest<T>(path, { accessToken, signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted)
            setResult({ path, token: accessToken, data });
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted)
            setResult({ path, token: accessToken, error: error.message });
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [accessToken, path, revision, delay]);
  const current =
    result?.path === path && result?.token === accessToken ? result : undefined;
  return {
    data: current?.data,
    error: current?.error,
    loading: loading || !current,
    refresh,
    accessToken,
  };
}
