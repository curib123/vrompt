'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest, type Model, type Conversation } from '@/lib/api';

export type Project = {
  id: string;
  name: string;
  instructions: string;
  context: string;
  preferredModelId: string | null;
  archived: boolean;
};
type Detail = Project & {
  conversations: Conversation[];
  prompts: { id: string; title: string }[];
  files: { id: string; name: string; conversationId: string }[];
};
const empty = {
  name: '',
  instructions: '',
  context: '',
  preferredModelId: null as string | null,
  archived: false,
};
export function Projects() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Project[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string>();
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState<Detail>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    setItems(
      await apiRequest<Project[]>('/workspace/projects', {
        accessToken: accessToken!,
      }),
    );
  }
  useEffect(() => {
    if (accessToken) {
      // Hydrate projects from the authenticated API.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void load().catch((e) => setError(e.message));
      void apiRequest<Model[]>('/workspace/models', { accessToken })
        .then(setModels)
        .catch((e) => setError(e.message));
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/workspace/projects${editing ? `/${editing}` : ''}`, {
        accessToken: accessToken!,
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(form),
      });
      setEditing(undefined);
      setForm(empty);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-page">
      <h1>Projects</h1>
      <p className="muted">
        Keep chats, files, prompts and instructions together.
      </p>
      {error && (
        <p role="alert" className="error-banner">
          {error} <Link href="/billing">View plans</Link>
        </p>
      )}
      <form className="panel" onSubmit={save}>
        <h2>{editing ? 'Edit Project' : 'New Project'}</h2>
        <label>
          Name
          <input
            required
            maxLength={160}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Instructions
          <textarea
            maxLength={8000}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="How should AI help with this Project?"
          />
        </label>
        <label>
          Reference context
          <textarea
            rows={5}
            maxLength={200000}
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            placeholder="Only relevant excerpts are included in a response."
          />
        </label>
        <label>
          Preferred model
          <select
            value={form.preferredModelId ?? ''}
            onChange={(e) =>
              setForm({ ...form, preferredModelId: e.target.value || null })
            }
          >
            <option value="">Auto — Recommended</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.archived}
            onChange={(e) => setForm({ ...form, archived: e.target.checked })}
          />{' '}
          Archived
        </label>
        <div className="row-actions">
          <button disabled={busy} className="primary-button">
            Save Project
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(undefined);
                setForm(empty);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
      <input
        aria-label="Search Projects"
        placeholder="Search Projects"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {items
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        .map((p) => (
          <div className="row" key={p.id}>
            <span>
              {p.name}
              {p.archived ? ' · Archived' : ''}
            </span>
            <div className="row-actions">
              {!p.archived && (
                <Link href={`/chat?project=${p.id}`}>New chat</Link>
              )}
              <button
                onClick={() =>
                  void apiRequest<Detail>(`/workspace/projects/${p.id}`, {
                    accessToken: accessToken!,
                  })
                    .then(setDetail)
                    .catch((e) => setError(e.message))
                }
              >
                Open
              </button>
              <button
                onClick={() => {
                  setEditing(p.id);
                  setForm({
                    name: p.name,
                    instructions: p.instructions,
                    context: p.context,
                    preferredModelId: p.preferredModelId,
                    archived: p.archived,
                  });
                }}
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      'Delete this Project and its workflows? Chats, files and Saved Prompts remain in your workspace.',
                    )
                  )
                    void apiRequest(`/workspace/projects/${p.id}`, {
                      accessToken: accessToken!,
                      method: 'DELETE',
                    })
                      .then(load)
                      .catch((e) => setError(e.message));
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      {detail && (
        <section className="panel">
          <h2>{detail.name}</h2>
          <h3>Chats</h3>
          {detail.conversations.map((c) => (
            <p key={c.id}>
              <Link href={`/chat?id=${c.id}`}>{c.title}</Link>
            </p>
          ))}
          <h3>Files</h3>
          {detail.files.map((f) => (
            <p key={f.id}>
              <Link href={`/chat?id=${f.conversationId}`}>{f.name}</Link>
            </p>
          ))}
          <h3>Saved Prompts</h3>
          {detail.prompts.map((p) => (
            <p key={p.id}>{p.title}</p>
          ))}
          <Link href="/workflows">Manage workflows</Link>
        </section>
      )}
    </div>
  );
}
