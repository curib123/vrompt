'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';
import type { CategoryOption, TagOption } from '@/lib/api';
import { AdminLoading, AdminPageHeader, ConfirmDialog } from './admin-ui';
import { useToast } from '@/components/ui/toast';

export function TaxonomyAdmin() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: 'Categories' | 'Tags';
    slug: string;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { pushToast } = useToast();
  useEffect(() => {
    let active = true;
    void Promise.all([
      apiRequest<CategoryOption[]>('/categories'),
      apiRequest<TagOption[]>('/tags?limit=30'),
    ])
      .then(([nextCategories, nextTags]) => {
        if (active) {
          setCategories(nextCategories);
          setTags(nextTags);
          setError('');
          setLoaded(true);
        }
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : 'Taxonomy could not be loaded',
          );
      });
    return () => {
      active = false;
    };
  }, [revision]);
  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    try {
      await apiRequest('/categories', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ name: category }),
      });
      setCategory('');
      setRevision((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Category could not be created',
      );
    }
  }
  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    try {
      await apiRequest('/tags', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ name: tag }),
      });
      setTag('');
      setRevision((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Tag could not be created',
      );
    }
  }
  async function updateItem(
    kind: 'Categories' | 'Tags',
    slug: string,
    name: string,
  ) {
    if (!accessToken) return;
    try {
      await apiRequest(
        `/${kind === 'Categories' ? 'categories' : 'tags'}/${slug}`,
        {
          accessToken,
          method: 'PATCH',
          body: JSON.stringify({ name }),
        },
      );
      setRevision((value) => value + 1);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Item could not be updated',
      );
    }
  }
  async function removeItem(kind: 'Categories' | 'Tags', slug: string) {
    if (!accessToken) return;
    try {
      await apiRequest(
        `/${kind === 'Categories' ? 'categories' : 'tags'}/${slug}`,
        { accessToken, method: 'DELETE' },
      );
      setRevision((value) => value + 1);
      setPendingDelete(null);
      pushToast({
        title: `${kind === 'Categories' ? 'Category' : 'Tag'} deleted`,
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Item could not be deleted',
      );
    }
  }
  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Content"
        title="Categories & tags"
        description="Manage the vocabulary people use to organize and discover prompts."
      />
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!loaded && !error ? (
        <AdminLoading label="Loading categories and tags" />
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <TaxonomyList
          items={categories}
          label="Categories"
          value={category}
          onChange={setCategory}
          onCreate={createCategory}
          onDelete={(slug) => setPendingDelete({ kind: 'Categories', slug })}
          onUpdate={(slug, name) => void updateItem('Categories', slug, name)}
        />
        <TaxonomyList
          items={tags}
          label="Tags"
          value={tag}
          onChange={setTag}
          onCreate={createTag}
          onDelete={(slug) => setPendingDelete({ kind: 'Tags', slug })}
          onUpdate={(slug, name) => void updateItem('Tags', slug, name)}
        />
      </div>
      <ConfirmDialog
        confirmLabel="Delete permanently"
        description={`Deleting this ${pendingDelete?.kind === 'Categories' ? 'category' : 'tag'} cannot be undone. Items in use may be protected by the server.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={() =>
          pendingDelete &&
          void removeItem(pendingDelete.kind, pendingDelete.slug)
        }
        open={Boolean(pendingDelete)}
        title="Delete taxonomy item?"
      />
    </div>
  );
}

function TaxonomyList({
  items,
  label,
  value,
  onChange,
  onCreate,
  onDelete,
  onUpdate,
}: {
  items: Array<{ id: string; name: string; slug: string }>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCreate: (event: React.FormEvent) => void;
  onDelete: (slug: string) => void;
  onUpdate: (slug: string, name: string) => void;
}) {
  return (
    <Card className="grid content-start gap-4">
      <h2 className="text-2xl font-semibold">{label}</h2>
      <form className="flex gap-2" onSubmit={onCreate}>
        <Input
          aria-label={`New ${label.toLowerCase()}`}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`New ${label.toLowerCase()}`}
          required
          value={value}
        />
        <Button type="submit">Add</Button>
      </form>
      <div className="grid gap-2">
        {items.map((item) => (
          <TaxonomyItem
            item={item}
            key={item.id}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </Card>
  );
}

function TaxonomyItem({
  item,
  onDelete,
  onUpdate,
}: {
  item: { id: string; name: string; slug: string };
  onDelete: (slug: string) => void;
  onUpdate: (slug: string, name: string) => void;
}) {
  const [name, setName] = useState(item.name);
  return (
    <div className="grid gap-2 rounded-xl bg-[#F5F5F3] p-3 dark:bg-[#202020]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-brand-mid">/{item.slug}</span>
        <button
          className="text-xs font-medium text-red-600 dark:text-red-400"
          onClick={() => onDelete(item.slug)}
          type="button"
        >
          Delete
        </button>
      </div>
      <div className="flex gap-2">
        <Input
          aria-label={`Name for ${item.name}`}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        <Button
          disabled={!name.trim() || name === item.name}
          onClick={() => onUpdate(item.slug, name)}
          variant="secondary"
        >
          Save
        </Button>
      </div>
    </div>
  );
}
