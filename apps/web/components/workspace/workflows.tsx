'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { apiRequest, type Model } from '@/lib/api';
import type { Project } from './projects';
type Step = { name: string; prompt: string; modelId: string | null };
type Workflow = {
  id: string;
  projectId: string;
  name: string;
  enabled: boolean;
  steps: Step[];
};
type Run = {
  id: string;
  status: string;
  completedSteps: number;
  conversationId: string;
  error: string | null;
  createdAt: string;
};
const first: Step = {
  name: 'Summarize',
  prompt: 'Summarize the input concisely.',
  modelId: null,
};
export function Workflows() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<Workflow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [steps, setSteps] = useState<Step[]>([first]);
  const [input, setInput] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  async function load() {
    setItems(
      await apiRequest<Workflow[]>('/workspace/workflows', {
        accessToken: accessToken!,
      }),
    );
  }
  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      load(),
      apiRequest<Project[]>('/workspace/projects', { accessToken }).then(
        setProjects,
      ),
      apiRequest<Model[]>('/workspace/models', { accessToken }).then(setModels),
    ]).catch((e) => setError(e.message));
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => abort.current?.abort(), []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiRequest(`/workspace/workflows${editing ? `/${editing}` : ''}`, {
        accessToken: accessToken!,
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({ projectId, name, steps, enabled: true }),
      });
      setEditing(undefined);
      setName('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function run(w: Workflow) {
    setBusy(true);
    setError('');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await apiRequest<Run>(
        `/workspace/workflows/${w.id}/runs`,
        {
          accessToken: accessToken!,
          method: 'POST',
          signal: controller.signal,
          body: JSON.stringify({ requestId: crypto.randomUUID(), input }),
        },
      );
      setRuns((old) => [result, ...old]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  function change(index: number, patch: Partial<Step>) {
    setSteps((old) =>
      old.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }
  return (
    <div className="content-page">
      <h1>Workflows</h1>
      <p className="muted">
        Reusable steps inside a Project. Each step uses your normal allowance.
      </p>
      {error && (
        <p className="error-banner" role="alert">
          {error} <Link href="/billing">View plans</Link>
        </p>
      )}
      <form className="panel" onSubmit={save}>
        <h2>{editing ? 'Edit workflow' : 'Create workflow'}</h2>
        <label>
          Name
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Project
          <select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Choose Project</option>
            {projects
              .filter((p) => !p.archived)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        {steps.map((s, i) => (
          <fieldset key={i}>
            <legend>Step {i + 1}</legend>
            <label>
              Name
              <input
                required
                value={s.name}
                onChange={(e) => change(i, { name: e.target.value })}
              />
            </label>
            <label>
              Instructions
              <textarea
                required
                maxLength={8000}
                value={s.prompt}
                onChange={(e) => change(i, { prompt: e.target.value })}
              />
            </label>
            <label>
              Model
              <select
                value={s.modelId ?? ''}
                onChange={(e) => change(i, { modelId: e.target.value || null })}
              >
                <option value="">Auto — Recommended</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!i}
              onClick={() =>
                setSteps((old) => {
                  const next = [...old];
                  [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                  return next;
                })
              }
            >
              Move up
            </button>{' '}
            <button
              type="button"
              disabled={steps.length === 1}
              onClick={() => setSteps((old) => old.filter((_, n) => n !== i))}
            >
              Remove step
            </button>
          </fieldset>
        ))}
        <div className="row-actions">
          <button
            type="button"
            onClick={() =>
              setSteps((old) => [
                ...old,
                {
                  name: 'Extract tasks',
                  prompt: 'Extract actionable tasks from the input.',
                  modelId: null,
                },
              ])
            }
          >
            Add step
          </button>
          <button className="primary-button" disabled={busy}>
            Save workflow
          </button>
        </div>
      </form>
      <label>
        Input for execution
        <textarea
          rows={5}
          value={input}
          maxLength={32000}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a document or instructions"
        />
      </label>
      {busy && (
        <button onClick={() => abort.current?.abort()}>Stop execution</button>
      )}
      {items.map((w) => (
        <section className="panel" key={w.id}>
          <h2>{w.name}</h2>
          <p>{w.steps.map((s) => s.name).join(' → ')}</p>
          <div className="row-actions">
            <button
              disabled={busy || !w.enabled || !input.trim()}
              onClick={() => void run(w)}
            >
              Run / retry from start
            </button>
            <button
              onClick={() => {
                setEditing(w.id);
                setName(w.name);
                setProjectId(w.projectId);
                setSteps(w.steps);
              }}
            >
              Edit
            </button>
            <button
              onClick={() => {
                setEditing(undefined);
                setName(`${w.name} copy`);
                setProjectId(w.projectId);
                setSteps(w.steps);
              }}
            >
              Duplicate
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void apiRequest(`/workspace/workflows/${w.id}`, {
                  accessToken: accessToken!,
                  method: 'PATCH',
                  body: JSON.stringify({
                    projectId: w.projectId,
                    name: w.name,
                    steps: w.steps,
                    enabled: !w.enabled,
                  }),
                })
                  .then(load)
                  .catch((e) => setError(e.message))
              }
            >
              {w.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={() =>
                void apiRequest<Run[]>(`/workspace/workflows/${w.id}/runs`, {
                  accessToken: accessToken!,
                })
                  .then(setRuns)
                  .catch((e) => setError(e.message))
              }
            >
              History
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Delete this workflow and its run history? Execution conversations remain saved.',
                  )
                )
                  void apiRequest(`/workspace/workflows/${w.id}`, {
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
        </section>
      ))}
      {runs.length > 0 && (
        <section className="panel">
          <h2>Execution history</h2>
          {runs.map((r) => (
            <div className="row" key={r.id}>
              <span>
                {r.status} · {r.completedSteps} steps complete
                <br />
                {r.error}
              </span>
              <Link href={`/chat?id=${r.conversationId}`}>View output</Link>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
