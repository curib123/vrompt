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
import type { AuthResponse, AuthUser } from '@/lib/api';

interface AuthContextValue {
  accessToken: string | null;
  beginGoogleLogin: () => void;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function refreshSession() {
    const session = await apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(session.accessToken);
    setUser(session.user);
  }

  const initializeSession = useEffectEvent(async () => {
    try {
      await refreshSession();
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

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        beginGoogleLogin,
        isLoading,
        logout,
        refreshSession,
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
