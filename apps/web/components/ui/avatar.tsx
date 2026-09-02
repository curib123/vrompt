'use client';

import { cn } from '@/lib/cn';
import { useState } from 'react';

export function Avatar({
  avatar,
  name,
  className,
}: {
  avatar?: string | null;
  name: string;
  className?: string;
}) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  const showImage = Boolean(avatar && failedAvatar !== avatar);

  return (
    <div
      aria-label={`${name} avatar`}
      className={cn(
        'flex size-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-xs font-semibold uppercase tracking-[0.2em] text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-white',
        className,
      )}
      role="img"
    >
      {showImage ? (
        // The API validates avatar uploads and Google supplies trusted HTTPS URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-full rounded-full object-cover"
          decoding="async"
          onError={() => setFailedAvatar(avatar ?? null)}
          src={avatar ?? undefined}
        />
      ) : (
        initials
      )}
    </div>
  );
}
