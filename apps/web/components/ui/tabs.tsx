'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface TabItem {
  content: ReactNode;
  id: string;
  label: string;
}

export function Tabs({ items }: { items: TabItem[] }) {
  const [activeTab, setActiveTab] = useState(items[0]?.id ?? '');
  const idPrefix = useId();
  const currentTab = items.find((item) => item.id === activeTab)?.id ?? items[0]?.id ?? '';

  return (
    <div className="space-y-4">
      <div
        aria-label="Sections"
        className="flex flex-wrap gap-2 rounded-full border border-zinc-200 p-2 dark:border-zinc-800"
        role="tablist"
      >
        {items.map((item, index) => {
          const isSelected = item.id === currentTab;

          return (
            <button
              aria-controls={`${idPrefix}-${item.id}`}
              aria-selected={isSelected}
              className={cn(
                'rounded-full px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white',
                isSelected
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900',
              )}
              id={`${idPrefix}-${item.id}-tab`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
                  return;
                }

                const direction = event.key === 'ArrowRight' ? 1 : -1;
                const nextItem =
                  items[(index + direction + items.length) % items.length];

                if (nextItem) {
                  setActiveTab(nextItem.id);
                }
              }}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          aria-labelledby={`${idPrefix}-${item.id}-tab`}
          className={cn(item.id === currentTab ? 'block' : 'hidden')}
          id={`${idPrefix}-${item.id}`}
          key={item.id}
          role="tabpanel"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
