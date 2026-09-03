'use client';

import { createContext, useContext, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { rememberOAuthReturnPath } from '@/lib/auth-return';

type AuthModalOptions = {
  description?: string;
  returnTo?: string;
  title?: string;
};

type AuthModalContextValue = {
  openAuthModal: (options?: AuthModalOptions) => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { beginGitHubLogin, beginGoogleLogin } = useAuth();
  const [options, setOptions] = useState<AuthModalOptions | null>(null);

  function begin(provider: 'github' | 'google') {
    rememberOAuthReturnPath(options?.returnTo);
    trackAnalyticsEvent('signup_started', {
      source: provider,
      surface: 'auth_modal',
    });
    if (provider === 'google') beginGoogleLogin();
    else beginGitHubLogin();
  }

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal: (nextOptions = {}) => setOptions(nextOptions) }}
    >
      {children}
      <Modal
        className="max-w-md"
        description={
          options?.description ??
          'Sign in or create your Vrompt account with one secure click.'
        }
        onClose={() => setOptions(null)}
        open={options !== null}
        title={options?.title ?? 'Continue with Vrompt'}
      >
        <div className="grid gap-4">
          <BrandLockup compact />
          <Button
            className="min-h-14 w-full rounded-2xl"
            onClick={() => begin('google')}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <Button
            className="min-h-14 w-full rounded-2xl"
            onClick={() => begin('github')}
            variant="secondary"
          >
            <GitHubIcon />
            Continue with GitHub
          </Button>
          <p className="text-sm leading-6 text-brand-mid">
            Already have an account? Choose the same provider you used before.
            New accounts can finish their creator profile after signing in.
          </p>
        </div>
      </Modal>
    </AuthModalContext.Provider>
  );
}

export function AuthModalTrigger({
  children,
  description,
  returnTo,
  title,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & AuthModalOptions) {
  const { openAuthModal } = useAuthModal();
  return (
    <button
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          openAuthModal({ description, returnTo, title });
        }
      }}
      type={type}
    >
      {children}
    </button>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context)
    throw new Error('useAuthModal must be used in AuthModalProvider');
  return context;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.5 14a6 6 0 0 1 0-3.9V7.4H3.1a10 10 0 0 0 0 9.2L6.5 14Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3.1 7.4l3.4 2.7A5.9 5.9 0 0 1 12 5.9Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1 1.6 1 .9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.3-2.3-.3-4.7-1.1-4.7-5A3.9 3.9 0 0 1 6.7 8c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1a9.7 9.7 0 0 1 5.1 0c2-1.3 2.8-1 2.8-1 .6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 2V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
    </svg>
  );
}
