'use client';

import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { apiRequest, getApiBaseUrl } from '@/lib/api';
import { trackAnalyticsEvent } from '@/lib/analytics';
import type { AuthResponse, AuthUser } from '@/lib/api';

interface AuthContextValue {
  accessToken: string | null;
  beginGitHubLogin: () => void;
  beginGoogleLogin: () => void;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthUser>;
  staffLogin: (email: string, password: string) => Promise<AuthUser>;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refreshSession(): Promise<AuthUser> {
    const session = await apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }

  const initializeSession = useEffectEvent(async () => {
    try {
      const session = await refreshSession();
      if (
        session.onboardingCompleted &&
        !window.sessionStorage.getItem('vrompt-returning-user')
      ) {
        window.sessionStorage.setItem('vrompt-returning-user', '1');
        trackAnalyticsEvent('returning_user', { source: 'session_refresh' });
      }
    } catch {
      // A missing or expired refresh cookie simply means the user is signed out.
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    // The initial session check synchronizes React state with the HttpOnly cookie.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void initializeSession();
  }, []);

  function beginGoogleLogin() {
    window.location.replace(`${getApiBaseUrl()}/auth/google`);
  }

  function beginGitHubLogin() {
    window.location.replace(`${getApiBaseUrl()}/auth/github`);
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function staffLogin(email: string, password: string) {
    const session = await apiRequest<AuthResponse>('/auth/staff/login', {
      body: JSON.stringify({ email, password }),
      method: 'POST',
    });
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        beginGitHubLogin,
        beginGoogleLogin,
        isLoading,
        logout,
        refreshSession,
        staffLogin,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
