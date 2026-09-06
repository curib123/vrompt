'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useFeedback } from '@/components/ui/feedback-modal';
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
  const { alert, confirm } = useFeedback();
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
      alert({
        tone: 'success',
        title: editing ? 'Project updated' : 'Project created',
        message: 'Your project is ready for new chats and workflows.',
      });
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      alert({ tone: 'error', title: 'Could not save project', message });
    } finally {
      setBusy(false);
    }
  }

  const filteredItems = items.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="content-page workspace-resource-page projects-page">
      <header className="resource-page-header">
        <div>
          <p className="resource-eyebrow">Workspace / Projects</p>
          <h1>Projects</h1>
          <p className="muted">
            Keep chats, files, prompts and instructions together in one focused
            space.
          </p>
        </div>
        <div className="resource-header-meta" aria-label="Project summary">
          <span className="resource-stat">{items.length} projects</span>
          <span className="resource-stat-muted">Auto model ready</span>
        </div>
      </header>
      {error && (
        <p role="alert" className="error-banner">
          {error} <Link href="/billing">View plans</Link>
        </p>
      )}
      <div className="resource-layout projects-layout">
        <form className="panel resource-editor-panel" onSubmit={save}>
          <div className="resource-form-heading">
            <div>
              <p className="resource-eyebrow">Project setup</p>
              <h2>{editing ? 'Edit project' : 'New project'}</h2>
            </div>
            <span className="resource-form-hint">All fields stay editable</span>
          </div>
          <div className="resource-form-fields">
            <label>
              Name
              <input
                required
                maxLength={160}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Product launch"
              />
            </label>
            <label>
              Instructions
              <textarea
                maxLength={8000}
                value={form.instructions}
                onChange={(e) =>
                  setForm({ ...form, instructions: e.target.value })
                }
                placeholder="How should AI help with this project?"
              />
              <span className="field-hint">
                Set the tone, goals, or rules you want every chat to follow.
              </span>
            </label>
            <label>
              Reference context
              <textarea
                rows={5}
                maxLength={200000}
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                placeholder="Add product notes, background, or source material."
              />
              <span className="field-hint">
                Only relevant excerpts are included in a response.
              </span>
            </label>
            <label>
              Preferred model
              <select
                value={form.preferredModelId ?? ''}
                onChange={(e) =>
                  setForm({ ...form, preferredModelId: e.target.value || null })
                }
              >
                <option value="">Auto - Recommended</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.archived}
                onChange={(e) =>
                  setForm({ ...form, archived: e.target.checked })
                }
              />
              <span>
                <strong>Archive project</strong>
                <small>Hide it from new chat and workflow choices.</small>
              </span>
            </label>
          </div>
          <div className="row-actions resource-form-actions">
            <button disabled={busy} className="primary-button">
              {editing ? 'Save changes' : 'Create project'}
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

        <section
          className="resource-list-panel"
          aria-labelledby="projects-list-title"
        >
          <div className="resource-list-header">
            <div>
              <p className="resource-eyebrow">Your workspace</p>
              <h2 id="projects-list-title">Projects</h2>
              <p className="muted">Open a project to see its connected work.</p>
            </div>
            <div className="resource-list-tools">
              <span className="resource-count">
                {filteredItems.length} shown
              </span>
              <input
                aria-label="Search Projects"
                placeholder="Search projects"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="resource-card-list">
            {filteredItems.map((p) => (
              <article className="resource-card project-card" key={p.id}>
                <div className="resource-card-main">
                  <div className="resource-card-title-row">
                    <h3>{p.name}</h3>
                    <span
                      className={`status-badge ${p.archived ? 'suspended' : 'active'}`}
                    >
                      {p.archived ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <p className="resource-card-meta">
                    {p.preferredModelId
                      ? (models.find((m) => m.id === p.preferredModelId)
                          ?.displayName ?? 'Selected model')
                      : 'Auto model selection'}
                  </p>
                </div>
                <div className="row-actions resource-card-actions">
                  {!p.archived && (
                    <Link href={`/chat?project=${p.id}`}>New chat</Link>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void apiRequest<Detail>(`/workspace/projects/${p.id}`, {
                        accessToken: accessToken!,
                      })
                        .then(setDetail)
                        .catch((e) => {
                          setError(e.message);
                          alert({
                            tone: 'error',
                            title: 'Could not open project',
                            message: e.message,
                          });
                        })
                    }
                  >
                    Open
                  </button>
                  <button
                    type="button"
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
                    type="button"
                    onClick={async () => {
                      const accepted = await confirm({
                        title: 'Delete project?',
                        message:
                          'This removes the project and its workflows. Chats, files, and saved prompts remain in your workspace.',
                        confirmLabel: 'Delete project',
                        destructive: true,
                      });
                      if (!accepted) return;
                      try {
                        await apiRequest(`/workspace/projects/${p.id}`, {
                          accessToken: accessToken!,
                          method: 'DELETE',
                        });
                        await load();
                        alert({
                          tone: 'success',
                          title: 'Project deleted',
                          message:
                            'The project and its workflows were removed.',
                        });
                      } catch (e) {
                        const message = (e as Error).message;
                        setError(message);
                        alert({
                          tone: 'error',
                          title: 'Could not delete project',
                          message,
                        });
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
            {filteredItems.length === 0 && (
              <div className="resource-empty">
                <h3>
                  {query
                    ? 'No matching projects'
                    : 'Your first project starts here'}
                </h3>
                <p>
                  {query
                    ? 'Try a different search term.'
                    : 'Create a project to keep related chats, context, and workflows together.'}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {detail && (
        <section className="panel project-detail-panel">
          <div className="resource-list-header">
            <div>
              <p className="resource-eyebrow">Project overview</p>
              <h2>{detail.name}</h2>
              <p className="muted">Everything connected to this project.</p>
            </div>
            <button type="button" onClick={() => setDetail(undefined)}>
              Close
            </button>
          </div>
          <div className="detail-grid">
            <div className="detail-group">
              <h3>Chats</h3>
              {detail.conversations.length ? (
                detail.conversations.map((c) => (
                  <p key={c.id}>
                    <Link href={`/chat?id=${c.id}`}>{c.title}</Link>
                  </p>
                ))
              ) : (
                <p className="muted">No chats yet.</p>
              )}
            </div>
            <div className="detail-group">
              <h3>Files</h3>
              {detail.files.length ? (
                detail.files.map((f) => (
                  <p key={f.id}>
                    <Link href={`/chat?id=${f.conversationId}`}>{f.name}</Link>
                  </p>
                ))
              ) : (
                <p className="muted">No files attached yet.</p>
              )}
            </div>
            <div className="detail-group">
              <h3>Saved prompts</h3>
              {detail.prompts.length ? (
                detail.prompts.map((p) => <p key={p.id}>{p.title}</p>)
              ) : (
                <p className="muted">No saved prompts yet.</p>
              )}
            </div>
          </div>
          <Link className="text-link" href="/workflows">
            Manage workflows
          </Link>
        </section>
      )}
    </div>
  );
}
