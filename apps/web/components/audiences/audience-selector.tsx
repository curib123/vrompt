'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { AudienceOption } from '@/lib/api';

export function AudienceSelector({
  options = [],
  selectedIds,
  onChange,
  disabled = false,
}: {
  options: AudienceOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const safeOptions = Array.isArray(options) ? options : [];
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];

  function toggle(id: string) {
    if (safeSelectedIds.includes(id)) {
      onChange(safeSelectedIds.filter((selectedId) => selectedId !== id));
      return;
    }
    if (safeSelectedIds.length >= 5) return;
    onChange([...safeSelectedIds, id]);
  }

  return (
    <div aria-label="Audience interests" className="grid gap-4" role="group">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Select the types of prompts you want to discover.
        </p>
        <Badge>{safeSelectedIds.length} of 5 selected</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {safeOptions.map((option) => {
          const selected = safeSelectedIds.includes(option.id);
          return (
            <button
              aria-pressed={selected}
              className={cn(
                'flex min-h-14 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white',
                selected
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-zinc-300 bg-white hover:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-white',
              )}
              disabled={disabled || (!selected && safeSelectedIds.length >= 5)}
              key={option.id}
              onClick={() => toggle(option.id)}
              type="button"
            >
              <span>
                <span className="block font-semibold">{option.name}</span>
                {option.description ? (
                  <span
                    className={cn(
                      'mt-1 block text-xs leading-5',
                      selected
                        ? 'text-zinc-300 dark:text-zinc-400'
                        : 'text-zinc-600 dark:text-zinc-400',
                    )}
                  >
                    {option.description}
                  </span>
                ) : null}
              </span>
              <span aria-hidden="true" className="text-lg">
                {selected ? '✓' : '+'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
