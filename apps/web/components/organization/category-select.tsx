'use client';

import { useEffect, useState } from 'react';

import { apiRequest } from '@/lib/api';
import type { CategoryOption } from '@/lib/api';

export function CategorySelect({
  onChange,
  value,
}: {
  onChange: (slug: string) => void;
  value: string;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    let active = true;

    void apiRequest<CategoryOption[]>('/categories')
      .then((result) => {
        if (active) {
          setCategories(result);
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <select
      aria-label="Prompt category"
      className="min-h-11 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm text-black outline-none transition focus:border-black dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-white"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">Choose a category</option>
      {categories.map((category) => (
        <option key={category.id} value={category.slug}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
