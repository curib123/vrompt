'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form';
import { CategorySelect } from './category-select';
import { TagPicker } from './tag-picker';
import type { TagOption } from '@/lib/api';

export function PromptOrganizationPanel() {
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<TagOption[]>([]);

  return (
    <Card className="grid gap-7">
      <div className="space-y-3">
        <Badge>Make it easy to find</Badge>
        <h1 className="text-3xl font-semibold tracking-[-0.05em]">
          Give your prompt a home.
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
          Choose a category and a few helpful keywords so people can find your
          prompt.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          description="One official category keeps discovery focused."
          label="Category"
        >
          <CategorySelect onChange={setCategory} value={category} />
        </FormField>
        <FormField
          description="Add descriptive keywords for autocomplete and discovery."
          label="Tags"
        >
          <TagPicker onChange={setTags} value={tags} />
        </FormField>
      </div>
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        {category ? `Category: ${category}` : 'Choose a category'} |{' '}
        {tags.length > 0
          ? `${tags.length} keyword${tags.length === 1 ? '' : 's'}`
          : 'Add a few keywords'}
      </div>
    </Card>
  );
}
