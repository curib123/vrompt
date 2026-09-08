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
import { Chrome, Github } from 'lucide-react';

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
                  <Chrome aria-hidden="true" size={19} strokeWidth={1.8} />
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
                  <Github aria-hidden="true" size={19} strokeWidth={1.8} />
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
            </div>
          </dialog>,
          document.body,
        )}
    </AuthDialogContext.Provider>
  );
}
