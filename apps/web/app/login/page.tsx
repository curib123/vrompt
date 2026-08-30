'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { RoutePlaceholder } from '@/components/route-placeholder';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      pushToast({
        title: 'Welcome back',
        description: 'Your session is active.',
      });
      router.push('/');
    } catch (submissionError: unknown) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to log in';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <RoutePlaceholder
        description="Authentication flows are intentionally not implemented yet, but the route, layout, and form primitives are ready for Phase 6."
        eyebrow="Auth"
        title="Log in to Vrompt"
      />
      <Card>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FormField label="Email">
              <Input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={email}
              />
            </FormField>
            <FormField label="Password">
              <Input
                autoComplete="current-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type="password"
                value={password}
              />
            </FormField>
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Signing in...' : 'Continue'}
            </Button>
          </FieldGroup>
        </form>
      </Card>
    </div>
  );
}
