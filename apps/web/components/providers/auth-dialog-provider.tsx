'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { useSiteSettings } from './site-settings-provider';
import { BrandMark } from '@/components/brand/brand-mark';
import { Icon } from '@/components/ui/icon';
import { rememberOAuthReturnPath } from '@/lib/auth-return';

const AuthDialogContext = createContext<{
  openLogin: (returnTo?: string) => void;
}>({ openLogin: () => {} });
export function useAuthDialog() {
  return useContext(AuthDialogContext);
}
export function SignInButton({
  children = 'Sign in',
  className,
  returnTo,
}: {
  children?: ReactNode;
  className?: string;
  returnTo?: string;
}) {
  const { openLogin } = useAuthDialog();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openLogin(returnTo)}
    >
      {children}
    </button>
  );
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, beginGoogleLogin, beginGitHubLogin } = useAuth();
  const { siteName, settings } = useSiteSettings();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const returnPath = useRef<string | undefined>(undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const routeLogin = pathname === '/login';
  const visible = (open || routeLogin) && !user;
  useEffect(() => {
    // Portals require the browser DOM after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  function close() {
    setOpen(false);
    setBusy(null);
    setError('');
    if (routeLogin) router.replace('/');
  }
  useEffect(() => {
    const node = dialog.current;
    if (!visible || !node) return;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [visible, mounted]);
  useEffect(() => {
    if (routeLogin && user)
      router.replace(user.role === 'ADMIN' ? '/admin' : '/chat');
    // Dismiss sign-in when the external session becomes authenticated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) setOpen(false);
  }, [routeLogin, user, router]);
  useEffect(() => {
    if (!routeLogin) return;
    const code = new URLSearchParams(window.location.search).get('error');
    // Read the OAuth callback outcome from the browser URL.
    if (code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(
        code.endsWith('_not_configured')
          ? 'This sign-in provider is not configured yet. Please try the other option.'
          : 'Sign-in could not be completed. Please try again.',
      );
    }
  }, [routeLogin]);
  function signIn(provider: 'google' | 'github') {
    setBusy(provider);
    setError('');
    const path =
      returnPath.current ??
      (routeLogin || pathname === '/'
        ? '/chat'
        : `${window.location.pathname}${window.location.search}`);
    try {
      rememberOAuthReturnPath(path);
      if (provider === 'google') beginGoogleLogin();
      else beginGitHubLogin();
    } catch {
      setError(
        'Unable to start sign-in. Please allow session storage and try again.',
      );
      setBusy(null);
    }
  }
  return (
    <AuthDialogContext.Provider
      value={{
        openLogin: (returnTo) => {
          returnPath.current = returnTo;
          setError('');
          setBusy(null);
          if (user) router.push(user.role === 'ADMIN' ? '/admin' : '/chat');
          else setOpen(true);
        },
      }}
    >
      {children}
      {mounted &&
        createPortal(
          <dialog
            ref={dialog}
            className="auth-dialog"
            aria-labelledby="auth-dialog-title"
            aria-describedby="auth-dialog-description"
            onCancel={(e) => {
              e.preventDefault();
              close();
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div className="auth-dialog-content">
              <button
                className="auth-close"
                type="button"
                aria-label="Close sign-in"
                onClick={close}
              >
                ×
              </button>
              <div className="auth-brand-tile">
                <BrandMark />
              </div>
              <p className="eyebrow">ONE ACCOUNT. MORE POSSIBILITIES.</p>
              <h1 id="auth-dialog-title">Welcome to {siteName}.</h1>
              <p id="auth-dialog-description">
                Your ideas deserve good company.
                <br />
                Sign in to your AI workspace.
              </p>
              {error && (
                <p role="alert" className="error-banner">
                  {error}
                </p>
              )}
              {settings['features.registrationEnabled'] === false && (
                <p className="auth-registration-note">
                  Registration is currently closed. Existing accounts can still
                  sign in.
                </p>
              )}
              <div className="auth-options">
                <button
                  className="oauth-button"
                  disabled={isLoading || Boolean(busy)}
                  onClick={() => signIn('google')}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.3 2.9-7.4Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 22c2.7 0 5-1 6.7-2.4l-3.3-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3v2.6A10 10 0 0 0 12 22Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.4 14a6 6 0 0 1 0-4V7.4H3a10 10 0 0 0 0 9.2L6.4 14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.4L6.4 10C7.2 7.7 9.4 5.9 12 5.9Z"
                    />
                  </svg>
                  {busy === 'google'
                    ? 'Connecting to Google…'
                    : 'Continue with Google'}
                  <Icon name="arrow" />
                </button>
                <button
                  className="oauth-button"
                  disabled={isLoading || Boolean(busy)}
                  onClick={() => signIn('github')}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.2-1.5-1.2-1.5-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 3 .8.1-.6.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1A9.8 9.8 0 0 1 12 6.5c.8 0 1.7.1 2.5.3 2-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.8v3c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
                  </svg>
                  {busy === 'github'
                    ? 'Connecting to GitHub…'
                    : 'Continue with GitHub'}
                  <Icon name="arrow" />
                </button>
              </div>
              <div className="auth-divider">
                <span /> Your next idea starts here <span />
              </div>
              <div className="auth-benefits">
                <span>
                  <Icon name="chat" /> Save your conversations
                </span>
                <span>
                  <Icon name="cube" /> Explore available models
                </span>
              </div>
              <p className="auth-legal">
                By continuing, you agree to our{' '}
                <Link href="/terms" onClick={() => setOpen(false)}>
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" onClick={() => setOpen(false)}>
                  Privacy Policy
                </Link>
                .
              </p>
              <button
                className="auth-guest"
                onClick={() => {
                  close();
                  router.push('/chat');
                }}
              >
                Explore a temporary chat <Icon name="arrow" />
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </AuthDialogContext.Provider>
  );
}
