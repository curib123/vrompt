'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

export function Dropdown({
  items,
  label,
}: {
  items: Array<{ label: string; onSelect: () => void }>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        variant="secondary"
      >
        {label}
      </Button>
      {open ? (
        <div
          className="absolute right-0 top-full z-20 mt-2 min-w-52 rounded-[1.5rem] border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
          role="menu"
        >
          {items.map((item) => (
            <button
              className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-black transition hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:text-white dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
              key={item.label}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
