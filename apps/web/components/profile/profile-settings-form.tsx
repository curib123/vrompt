'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, getMediaUrl } from '@/lib/api';
import type { ProfileResponse } from '@/lib/api';

interface ProfileForm {
  bio: string;
  displayName: string;
  username: string;
  website: string;
}

const emptyForm: ProfileForm = {
  bio: '',
  displayName: '',
  username: '',
  website: '',
};

export function ProfileSettingsForm({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { accessToken, refreshSession, user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadProfile = useEffectEvent(async () => {
    if (!accessToken) {
      return;
    }

    try {
      const result = await apiRequest<ProfileResponse>('/profiles/me', {
        accessToken,
      });
      setProfile(result);
      setForm({
        bio: result.bio ?? '',
        displayName: result.displayName ?? '',
        username: result.username,
        website: result.website ?? '',
      });
    } catch {
      setError('We could not load your profile. Try refreshing the page.');
    }
  });

  useEffect(() => {
    // The initial profile load synchronizes React state with the authenticated API resource.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [accessToken]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const result = await apiRequest<ProfileResponse>('/profiles/me', {
        accessToken: accessToken ?? undefined,
        body: JSON.stringify({
          bio: form.bio || null,
          displayName: form.displayName || null,
          username: form.username,
          website: form.website || null,
        }),
        method: 'PATCH',
      });
      setProfile(result);
      setForm((current) => ({ ...current, username: result.username }));
      await refreshSession();
      setMessage('Profile updated.');
      window.dispatchEvent(new Event('vrompt:profile-updated'));
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Profile update failed.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsUploading(true);

    try {
      const body = new FormData();
      body.append('file', file);
      const result = await apiRequest<ProfileResponse>('/profiles/me/avatar', {
        accessToken: accessToken ?? undefined,
        body,
        method: 'POST',
      });
      setProfile(result);
      setMessage('Avatar updated.');
      window.dispatchEvent(new Event('vrompt:profile-updated'));
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Avatar upload failed.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  if (!profile) {
    return (
      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {error ?? 'Loading your profile...'}
        </p>
      </Card>
    );
  }

  return (
    <div
      className={
        embedded
          ? 'grid gap-6 pt-4 lg:grid-cols-[0.7fr_1.3fr]'
          : 'grid gap-8 lg:grid-cols-[0.7fr_1.3fr]'
      }
    >
      <Card className="space-y-6 bg-[#0D0D0D] text-white dark:border-white">
        <Badge className="!border-white/30 !text-zinc-300">Your identity</Badge>
        <div className="flex items-center gap-4">
          <Avatar
            avatar={getMediaUrl(profile.avatar)}
            className="size-20 !border-white/30 !bg-white/10 !text-white"
            name={profile.displayName || profile.username}
          />
          <div>
            <p className="text-xl font-semibold">
              {profile.displayName || profile.username}
            </p>
            <p className="font-mono text-sm text-zinc-400">
              @{profile.username}
            </p>
          </div>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium transition hover:bg-white hover:text-black">
          {isUploading ? 'Uploading...' : 'Change avatar'}
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={isUploading}
            onChange={(event) => void uploadAvatar(event)}
            type="file"
          />
        </label>
        <p className="text-xs leading-5 text-zinc-400">
          Use a JPEG, PNG, WebP, or GIF up to 5 MB. Your Google account remains
          the only sign-in method.
        </p>
      </Card>

      <Card>
        <div className="mb-8 space-y-2">
          <Badge>Profile settings</Badge>
          <h1
            className={
              embedded
                ? 'text-2xl font-semibold tracking-[-0.05em]'
                : 'text-3xl font-semibold tracking-[-0.05em]'
            }
          >
            Make your profile yours.
          </h1>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Keep the details that help other creators recognize and trust your
            work.
          </p>
        </div>
        <form
          className="grid gap-6"
          onSubmit={(event) => void saveProfile(event)}
        >
          <FieldGroup className="sm:grid-cols-2">
            <FormField
              description="3-32 lowercase letters, numbers, underscores, or hyphens."
              label="Username"
            >
              <Input
                maxLength={32}
                minLength={3}
                onChange={(event) =>
                  setForm({
                    ...form,
                    username: event.target.value.toLowerCase(),
                  })
                }
                pattern="[a-z0-9_-]+"
                required
                value={form.username}
              />
            </FormField>
            <FormField label="Display name">
              <Input
                maxLength={80}
                onChange={(event) =>
                  setForm({ ...form, displayName: event.target.value })
                }
                value={form.displayName}
              />
            </FormField>
          </FieldGroup>
          <FormField label="Bio">
            <Textarea
              maxLength={2000}
              onChange={(event) =>
                setForm({ ...form, bio: event.target.value })
              }
              placeholder="What do you make, explore, or want to share?"
              value={form.bio}
            />
          </FormField>
          <FormField
            description="Include https:// so your link is safe and clickable."
            label="Website"
          >
            <Input
              maxLength={500}
              onChange={(event) =>
                setForm({ ...form, website: event.target.value })
              }
              placeholder="https://example.com"
              type="url"
              value={form.website}
            />
          </FormField>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
          {message ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {message}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Signed in as {user?.email}
            </p>
            <Button disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : 'Save profile'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
