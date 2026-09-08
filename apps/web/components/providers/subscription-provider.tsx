'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { useWorkspaceResource } from '@/components/workspace/use-workspace-resource';

export type Billing = {
  plan: string;
  planCode?: string;
  planName?: string;
  subscription: { id: string; status: string; currentPeriodEnd: string } | null;
  latestPayment: { status: string; amount: number; currency: string } | null;
};
type SubscriptionResource = ReturnType<typeof useWorkspaceResource<Billing>>;
const SubscriptionContext = createContext<SubscriptionResource | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const resource = useWorkspaceResource<Billing>(
    '/billing/me',
    0,
    user?.role === 'USER',
  );
  const { refresh, data } = resource;
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      refresh();
    }
  }, [pathname, refresh]);
  useEffect(() => {
    if (user?.role !== 'USER') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    const end =
      data?.subscription?.status === 'ACTIVE'
        ? Date.parse(data.subscription.currentPeriodEnd)
        : NaN;
    const timer =
      Number.isFinite(end) && end > Date.now()
        ? setTimeout(refresh, Math.min(end - Date.now() + 100, 2_147_483_647))
        : undefined;
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(timer);
    };
  }, [user?.role, data, refresh]);
  return (
    <SubscriptionContext.Provider value={resource}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription requires SubscriptionProvider');
  return value;
}
