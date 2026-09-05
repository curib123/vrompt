'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

import { BrandLockup } from '@/components/brand/brand-mark';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function StaffLoginPage() {
  const router = useRouter();
  const { isLoading, staffLogin, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && user && ['ADMIN', 'MODERATOR'].includes(user.role))
      router.replace('/admin' as Route);
  }, [isLoading, router, user]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const signedIn = await staffLogin(email, password);
      if (!['ADMIN', 'MODERATOR'].includes(signedIn.role))
        throw new Error('Staff access required');
      router.replace('/admin' as Route);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Sign-in failed',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="grid content-start gap-7 rounded-[2rem] p-6 sm:p-10">
        <BrandLockup compact />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand-mid">
            Secure staff access
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
            Control panel
          </h1>
          <p className="mt-3 text-sm leading-7 text-brand-mid">
            Sign in with an administrator or moderator account.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <Input
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <Input
              autoComplete="current-password"
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? 'Signing in…' : 'Sign in to control panel'}
          </Button>
        </form>
      </Card>
      <section className="relative overflow-hidden rounded-[2rem] bg-[#0D0D0D] p-7 text-white sm:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-400">
          Role-aware operations
        </p>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
          Moderate safely. Manage flexibly.
        </h2>
        <p className="mt-5 max-w-md text-sm leading-7 text-zinc-300">
          Manage people, model configuration, billing and usage while keeping
          every administrative change auditable.
        </p>
      </section>
    </div>
  );
}
