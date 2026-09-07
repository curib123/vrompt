'use client';
import Link from 'next/link';
import { Modal } from '@/components/ui/modal';
import { ResourceState } from '@/components/ui/resource-state';
import { useWorkspaceResource } from './use-workspace-resource';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useFeedback } from '@/components/ui/feedback-modal';
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
  const { alert, confirm } = useFeedback();
  const resource = useWorkspaceResource<Workflow[]>('/workspace/workflows');
  const projectResource = useWorkspaceResource<Project[]>(
    '/workspace/projects',
  );
  const modelResource = useWorkspaceResource<Model[]>('/workspace/models');
  const items = resource.data ?? [];
  const projects = projectResource.data ?? [];
  const models = modelResource.data ?? [];
  const [editorOpen, setEditorOpen] = useState(false);
  const [running, setRunning] = useState<string>();
  const [historyName, setHistoryName] = useState<string>();
  const [editing, setEditing] = useState<string>();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [steps, setSteps] = useState<Step[]>([first]);
  const [input, setInput] = useState('');
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/workspace/workflows${editing ? `/${editing}` : ''}`, {
        accessToken: accessToken!,
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify({
          projectId,
          name: name.trim(),
          steps,
          enabled: editing
            ? (items.find((item) => item.id === editing)?.enabled ?? true)
            : true,
        }),
      });
      setEditing(undefined);
      setName('');
      setProjectId('');
      setSteps([{ ...first }]);
      setEditorOpen(false);
      resource.refresh();
      alert({
        tone: 'success',
        title: editing ? 'Workflow updated' : 'Workflow created',
        message: 'Your workflow is ready to run from this workspace.',
      });
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      alert({ tone: 'error', title: 'Could not save workflow', message });
    } finally {
      setBusy(false);
    }
  }

  async function run(w: Workflow) {
    if (busy) return;
    setBusy(true);
    setRunning(w.id);
    setHistoryName(w.name);
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
      if (result.status === 'SUCCEEDED' || result.status === 'COMPLETED')
        alert({
          tone: 'success',
          title: 'Workflow completed',
          message: 'View the output in run history below.',
        });
      else
        setError(
          result.error ??
            'The workflow did not complete. Check its run history.',
        );
    } catch (e) {
      const message = (e as Error).message;
      setError(message);
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        alert({ tone: 'error', title: 'Workflow failed', message });
      }
    } finally {
      setBusy(false);
      abort.current = null;
      setRunning(undefined);
    }
  }

  function change(index: number, patch: Partial<Step>) {
    setSteps((old) =>
      old.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  return (
    <div className="content-page workspace-resource-page workflows-page">
      <header className="resource-page-header">
        <div>
          <p className="resource-eyebrow">Workspace / Workflows</p>
          <h1>Workflows</h1>
          <p className="muted">
            Turn repeatable tasks into clear, multi-step runs inside a project.
          </p>
        </div>
        <div className="resource-header-meta" aria-label="Workflow summary">
          <span className="resource-stat">{items.length} workflows</span>
          <button
            className="primary-button"
            disabled={
              busy ||
              projectResource.loading ||
              Boolean(projectResource.error) ||
              !projects.some((p) => !p.archived)
            }
            onClick={() => {
              setEditing(undefined);
              setName('');
              setProjectId('');
              setSteps([{ ...first }]);
              setError('');
              setEditorOpen(true);
            }}
          >
            New workflow
          </button>
        </div>
      </header>
      {error && !editorOpen && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <ResourceState
        loading={projectResource.loading}
        error={projectResource.error}
        empty={!projects.some((p) => !p.archived)}
        onRetry={projectResource.refresh}
      >
        <h2>A workflow needs a project</h2>
        <p>
          <Link href="/projects">Create or unarchive a project</Link> to
          organize your workflow and its output.
        </p>
      </ResourceState>
      <div className="workflow-library">
        <Modal
          open={editorOpen}
          title={editing ? 'Edit workflow' : 'Create workflow'}
          description="Each step uses the previous step's output. Start with a project and add your instructions."
          className="max-w-3xl"
          onClose={() => {
            if (!busy) setEditorOpen(false);
          }}
        >
          <form
            className="panel resource-editor-panel workflow-editor-panel"
            onSubmit={save}
          >
            <fieldset disabled={busy}>
              <div className="resource-form-fields workflow-basics">
                <label>
                  Name
                  <input
                    required
                    maxLength={160}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Customer feedback review"
                  />
                </label>
                <label>
                  Project
                  <select
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">Choose a project</option>
                    {projects
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="workflow-step-list">
                {steps.map((s, i) => (
                  <fieldset className="workflow-step-card" key={i}>
                    <legend className="sr-only">Step {i + 1}</legend>
                    <div className="step-card-header">
                      <div className="step-card-title">
                        <span className="step-number">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <span className="resource-eyebrow">
                            Workflow step
                          </span>
                          <strong>{s.name || 'Untitled step'}</strong>
                        </div>
                      </div>
                      <div className="step-card-actions">
                        <button
                          type="button"
                          disabled={!i}
                          aria-label={`Move step ${i + 1} up`}
                          onClick={() =>
                            setSteps((old) => {
                              const next = [...old];
                              [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                              return next;
                            })
                          }
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          disabled={steps.length === 1}
                          onClick={() =>
                            setSteps((old) => old.filter((_, n) => n !== i))
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="step-fields">
                      <label>
                        Step name
                        <input
                          required
                          value={s.name}
                          onChange={(e) => change(i, { name: e.target.value })}
                          placeholder="What should this step do?"
                        />
                      </label>
                      <label>
                        Instructions
                        <textarea
                          required
                          maxLength={8000}
                          value={s.prompt}
                          onChange={(e) =>
                            change(i, { prompt: e.target.value })
                          }
                          placeholder="Describe the task and the expected output."
                        />
                      </label>
                      <label>
                        Model
                        <select
                          value={s.modelId ?? ''}
                          onChange={(e) =>
                            change(i, { modelId: e.target.value || null })
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
                    </div>
                  </fieldset>
                ))}
              </div>
            </fieldset>
            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
            <ResourceState
              loading={modelResource.loading}
              error={modelResource.error}
              onRetry={modelResource.refresh}
            />
            <div className="row-actions resource-form-actions">
              <button
                type="button"
                disabled={busy || steps.length >= 10}
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
                {busy
                  ? 'Saving?'
                  : editing
                    ? 'Save changes'
                    : 'Create workflow'}
              </button>
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </button>
          </form>
        </Modal>

        <section className="panel workflow-run-panel">
          <div className="resource-form-heading">
            <div>
              <p className="resource-eyebrow">Run a workflow</p>
              <h2>Workflow input</h2>
            </div>
            <span className="resource-form-hint">
              Paste once, reuse anytime
            </span>
          </div>
          <label>
            Input for your workflow
            <textarea
              rows={9}
              value={input}
              maxLength={32000}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a document, brief, or instructions for your workflow."
            />
          </label>
          <p className="field-hint">
            Choose a workflow below to run it with this input. Auto selects the
            best available model for each step.
          </p>
          {running && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => abort.current?.abort()}
            >
              Stop waiting
            </button>
          )}
        </section>
      </div>

      <section
        className="resource-list-panel workflow-list-panel"
        aria-labelledby="workflows-list-title"
      >
        <div className="resource-list-header">
          <div>
            <p className="resource-eyebrow">Your workspace</p>
            <h2 id="workflows-list-title">Saved workflows</h2>
            <p className="muted">
              Run, refine, or reuse your repeatable tasks.
            </p>
          </div>
          <span className="resource-count">{items.length} saved</span>
        </div>
        <div className="resource-card-list">
          <ResourceState {...resource} onRetry={resource.refresh} />
          {!resource.loading &&
            items.map((w) => (
              <article className="resource-card workflow-card" key={w.id}>
                <div className="resource-card-main">
                  <div className="resource-card-title-row">
                    <h3>{w.name}</h3>
                    <span
                      className={`status-badge ${w.enabled ? 'active' : 'suspended'}`}
                    >
                      {w.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="resource-card-meta">
                    {projects.find((p) => p.id === w.projectId)?.name ??
                      'Project'}
                    <span aria-hidden="true"> · </span>
                    {w.steps.length} {w.steps.length === 1 ? 'step' : 'steps'}
                  </p>
                  <p className="workflow-step-preview">
                    {w.steps.map((s) => s.name).join('  →  ')}
                  </p>
                </div>
                <div className="row-actions resource-card-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={busy || !w.enabled || !input.trim()}
                    onClick={() => void run(w)}
                  >
                    {running === w.id ? 'Running?' : 'Run workflow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setEditorOpen(true);
                      setEditing(w.id);
                      setName(w.name);
                      setProjectId(w.projectId);
                      setSteps(w.steps.map((step) => ({ ...step })));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setEditorOpen(true);
                      setEditing(undefined);
                      setName(`${w.name} copy`);
                      setProjectId(w.projectId);
                      setSteps(w.steps.map((step) => ({ ...step })));
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        await apiRequest(`/workspace/workflows/${w.id}`, {
                          accessToken: accessToken!,
                          method: 'PATCH',
                          body: JSON.stringify({
                            projectId: w.projectId,
                            name: w.name,
                            steps: w.steps,
                            enabled: !w.enabled,
                          }),
                        });
                        resource.refresh();
                        alert({
                          tone: 'success',
                          title: w.enabled
                            ? 'Workflow disabled'
                            : 'Workflow enabled',
                          message: w.enabled
                            ? 'It will stay saved until you enable it again.'
                            : 'It can now be run from this page.',
                        });
                      } catch (e) {
                        const message = (e as Error).message;
                        setError(message);
                        alert({
                          tone: 'error',
                          title: 'Could not update workflow',
                          message,
                        });
                      }
                    }}
                  >
                    {w.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void apiRequest<Run[]>(
                        `/workspace/workflows/${w.id}/runs`,
                        {
                          accessToken: accessToken!,
                        },
                      )
                        .then((history) => {
                          setRuns(history);
                          setHistoryName(w.name);
                        })
                        .catch((e) => {
                          setError(e.message);
                          alert({
                            tone: 'error',
                            title: 'Could not load history',
                            message: e.message,
                          });
                        })
                    }
                  >
                    History
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const accepted = await confirm({
                        title: 'Delete workflow?',
                        message:
                          'This removes the workflow and its run history. Execution conversations remain saved.',
                        confirmLabel: 'Delete workflow',
                        destructive: true,
                      });
                      if (!accepted) return;
                      try {
                        await apiRequest(`/workspace/workflows/${w.id}`, {
                          accessToken: accessToken!,
                          method: 'DELETE',
                        });
                        resource.refresh();
                        alert({
                          tone: 'success',
                          title: 'Workflow deleted',
                          message:
                            'The workflow and its run history were removed.',
                        });
                      } catch (e) {
                        const message = (e as Error).message;
                        setError(message);
                        alert({
                          tone: 'error',
                          title: 'Could not delete workflow',
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
          {!resource.loading && !resource.error && items.length === 0 && (
            <div className="resource-empty">
              <h3>Create your first workflow</h3>
              <p>
                Choose New workflow to build a repeatable task, then run it
                here.
              </p>
            </div>
          )}
        </div>
      </section>

      {historyName && (
        <section className="panel execution-history-panel">
          <div className="resource-list-header">
            <div>
              <p className="resource-eyebrow">Latest runs</p>
              <h2>Run history: {historyName}</h2>
            </div>
            <span className="resource-count">{runs.length} runs</span>
          </div>
          <div className="run-list">
            {!runs.length && (
              <p className="muted">
                No runs yet. Add input and choose Run workflow to get started.
              </p>
            )}
            {runs.map((r) => (
              <div className="run-card" key={r.id}>
                <div>
                  <div className="resource-card-title-row">
                    <strong>
                      {r.status.toLowerCase().replaceAll('_', ' ')}
                    </strong>
                    <span className="resource-card-meta">
                      {r.completedSteps} steps complete
                    </span>
                  </div>
                  {r.error && <p className="run-error">{r.error}</p>}
                </div>
                <Link href={`/chat?id=${r.conversationId}`}>View output</Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
