'use client';

import { useDeferredValue, useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { TagOption } from '@/lib/api';

export function TagPicker({
  onChange,
  value,
}: {
  onChange: (tags: TagOption[]) => void;
  value: TagOption[];
}) {
  const { accessToken } = useAuth();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [suggestions, setSuggestions] = useState<TagOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void apiRequest<TagOption[]>(
        `/tags?q=${encodeURIComponent(deferredQuery)}`,
      )
        .then((result) => {
          if (active) {
            setSuggestions(result);
          }
        })
        .catch(() => {
          if (active) {
            setSuggestions([]);
          }
        });
    }, 160);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [deferredQuery]);

  function addTag(tag: TagOption) {
    if (value.some((selected) => selected.id === tag.id) || value.length >= 8) {
      return;
    }

    onChange([...value, tag]);
    setQuery('');
    setError(null);
  }

  async function addTypedTag() {
    const normalized = query.trim().replace(/\s+/g, ' ').toLowerCase();

    if (!normalized) {
      return;
    }

    const existing = suggestions.find((tag) => tag.name === normalized);

    if (existing) {
      addTag(existing);
      return;
    }

    if (!accessToken) {
      setError('Sign in to add a new topic.');
      return;
    }

    try {
      const tag = await apiRequest<TagOption>('/tags', {
        accessToken,
        body: JSON.stringify({ name: normalized }),
        method: 'POST',
      });
      addTag(tag);
    } catch (tagError: unknown) {
      setError(
        tagError instanceof Error
          ? tagError.message
          : 'Topic could not be added.',
      );
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <button
            aria-label={`Remove ${tag.name} topic`}
            className="inline-flex items-center gap-2 rounded-lg border border-black bg-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white dark:border-white dark:bg-white dark:text-black"
            key={tag.id}
            onClick={() =>
              onChange(value.filter((selected) => selected.id !== tag.id))
            }
            type="button"
          >
            {tag.name}
            <span aria-hidden="true">x</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          aria-label="Prompt topics"
          maxLength={50}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void addTypedTag();
            }
          }}
          placeholder="Search topics or add your own"
          value={query}
        />
          <Button onClick={() => void addTypedTag()} variant="secondary">
            Add topic
        </Button>
      </div>
      {query && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions
            .filter((tag) => !value.some((selected) => selected.id === tag.id))
            .slice(0, 6)
            .map((tag) => (
              <button key={tag.id} onClick={() => addTag(tag)} type="button">
                <Badge className="cursor-pointer hover:border-black dark:hover:border-white">
                  {tag.name}
                </Badge>
              </button>
            ))}
        </div>
      ) : null}
      <p className="text-xs leading-5 text-zinc-500">
        Add up to 8 topics to help people find this prompt. We will keep them
        tidy automatically.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
