'use client';

import { useId, useRef, useState } from 'react';
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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const currentTab =
    items.find((item) => item.id === activeTab)?.id ?? items[0]?.id ?? '';

  return (
    <div className="space-y-4">
      <div
        aria-label="Sections"
        className="flex max-w-full gap-2 overflow-x-auto rounded-full border border-zinc-200 p-2 dark:border-zinc-800"
        role="tablist"
      >
        {items.map((item, index) => {
          const isSelected = item.id === currentTab;

          return (
            <button
              aria-controls={`${idPrefix}-${item.id}`}
              aria-selected={isSelected}
              className={cn(
                'min-h-11 shrink-0 rounded-full px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white',
                isSelected
                  ? 'bg-[#0D0D0D] !text-white dark:bg-white dark:!text-[#0D0D0D]'
                  : '!text-[#4D4D4D] hover:bg-[#E6E6E6] dark:!text-zinc-300 dark:hover:bg-[#1A1A1A]',
              )}
              id={`${idPrefix}-${item.id}-tab`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              tabIndex={isSelected ? 0 : -1}
              onKeyDown={(event) => {
                if (
                  !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(
                    event.key,
                  )
                ) {
                  return;
                }

                event.preventDefault();
                const nextIndex =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? items.length - 1
                      : (index +
                          (event.key === 'ArrowRight' ? 1 : -1) +
                          items.length) %
                        items.length;
                const nextItem = items[nextIndex];

                if (nextItem) {
                  setActiveTab(nextItem.id);
                  tabRefs.current[nextIndex]?.focus();
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
