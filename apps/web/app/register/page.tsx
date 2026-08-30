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

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { pushToast } = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(email, username, password);
      pushToast({
        title: 'Account created',
        description: 'Welcome to Vrompt.',
      });
      router.push('/');
    } catch (submissionError: unknown) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to create your account';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <RoutePlaceholder
        description="The registration route shell is in place with responsive form structure and empty-state messaging."
        eyebrow="Auth"
        title="Create a Vrompt account"
      />
      <Card>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FormField label="Username">
              <Input
                autoComplete="username"
                maxLength={32}
                minLength={3}
                onChange={(event) => setUsername(event.target.value)}
                pattern="[A-Za-z0-9_]+"
                placeholder="prompt-maker"
                required
                value={username}
              />
            </FormField>
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
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a strong password"
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
              {isSubmitting ? 'Creating account...' : 'Reserve your handle'}
            </Button>
          </FieldGroup>
        </form>
      </Card>
    </div>
  );
}
