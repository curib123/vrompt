'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import {
  apiRequest,
  getApiBaseUrl,
  type Model,
  type Message,
  type Conversation,
  type ChatFile,
  type SavedPrompt,
  type Usage,
} from '@/lib/api';
import { GeneratedImage } from './generated-image';
import type { Project } from './projects';
import { BrandMark } from '@/components/brand/brand-mark';
import { ProviderIcon } from '@/components/brand/provider-icon';
import { useSiteSettings } from '@/components/providers/site-settings-provider';
import { Icon } from '@/components/ui/icon';
import { starterTasks } from '@/components/brand/landing';
import type { Preferences } from './preferences';
import { SignInButton } from '@/components/providers/auth-dialog-provider';
export function Chat() {
  const { accessToken, user } = useAuth();
  const { settings } = useSiteSettings();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [preferences, setPreferences] = useState<Preferences>();
  const createdNavigation = useRef<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [feature, setFeature] = useState<'chat' | 'image_generation'>('chat');
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState('AUTO');
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [recent, setRecent] = useState<Conversation[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [usage, setUsage] = useState<Usage>();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('New conversation');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const allowance = usage?.allowances.find((a) => a.bucket === selected);
  async function refresh() {
    if (!accessToken) return;
    const options = { accessToken };
    const [m, u, p, r] = await Promise.all([
      apiRequest<Model[]>('/workspace/models', options),
      apiRequest<Usage>('/workspace/usage', options),
      apiRequest<SavedPrompt[]>('/workspace/saved-prompts', options),
      apiRequest<Conversation[]>('/workspace/conversations', options),
    ]);
    setModels(m);
    setUsage(u);
    setPrompts(p);
    setRecent(r);
  }
  useEffect(() => {
    if (!accessToken) {
      void apiRequest<{
        enabled: boolean;
        dailyLimit: number;
        monthlyLimit: number;
      }>('/guest/configuration')
        .then((g) =>
          setUsage({
            plan: 'Guest',
            resets: { daily: '', monthly: '' },
            allowances: g.enabled
              ? [
                  {
                    bucket: 'AUTO',
                    allowedFeatures: ['chat'],
                    dailyLimit: g.dailyLimit,
                    dailyRemaining: g.dailyLimit,
                    monthlyLimit: g.monthlyLimit,
                    monthlyRemaining: g.monthlyLimit,
                    maxFiles: 0,
                    maxFileBytes: 0,
                  },
                ]
              : [],
          }),
        )
        .catch((e) => setError(e.message));
      return;
    }
    void apiRequest<Project[]>('/workspace/projects', { accessToken })
      .then(setProjects)
      .catch((e) => setError(e.message));
    // Hydrate the workspace from the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((e) => setError(e.message));
    void apiRequest<Preferences>('/workspace/preferences', { accessToken })
      .then(setPreferences)
      .catch((e) => setError(e.message));
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const inserted = sessionStorage.getItem('vrompt-insert-prompt');
    // Synchronize a prompt handed off through browser session storage.
    if (inserted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(inserted);
      sessionStorage.removeItem('vrompt-insert-prompt');
    }
    if (!accessToken) return;
    if (createdNavigation.current === id && id) {
      createdNavigation.current = null;
      return;
    }
    let current = true;
    setError('');
    setSelected('AUTO');
    if (!id) {
      setMessages([]);
      setFiles([]);
      setSelectedFiles([]);
      setTitle('New conversation');
      return;
    }
    void apiRequest<
      Conversation & { messages: Message[]; attachments: ChatFile[] }
    >(`/workspace/conversations/${id}`, { accessToken })
      .then((c) => {
        if (current) {
          setMessages(c.messages);
          setFiles(c.attachments);
          setSelectedFiles([]);
          setProjectId(c.projectId ?? '');
          setTitle(c.title);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [id, accessToken]);
  useEffect(() => {
    // Apply persisted defaults only to a new conversation.
    if (!id && preferences) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(
        models.some((model) => model.id === preferences.defaultModelId)
          ? preferences.defaultModelId!
          : 'AUTO',
      );
    }
  }, [id, preferences, models]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);
  async function ensureConversation() {
    if (id) return id;
    const c = await apiRequest<Conversation>('/workspace/conversations', {
      accessToken: accessToken!,
      method: 'POST',
      body: JSON.stringify({
        title: text.trim().slice(0, 80) || 'New conversation',
        projectId: projectId || null,
      }),
    });
    createdNavigation.current = c.id;
    router.replace(`/chat?id=${c.id}`);
    return c.id;
  }
  async function send(regenerate?: Message) {
    if (busy || (!text.trim() && !regenerate)) return;
    setBusy(true);
    setError('');
    const content = regenerate ? 'Regenerate' : text.trim();
    const controller = new AbortController();
    abort.current = controller;
    let conversationId = id;
    try {
      conversationId = accessToken ? await ensureConversation() : null;
      const response = await fetch(
        `${getApiBaseUrl()}${accessToken ? `/workspace/conversations/${conversationId}/messages` : '/guest/messages'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            content,
            attachmentIds: selectedFiles,
            feature: regenerate?.artifacts?.length
              ? 'image_generation'
              : feature,
            mode: selected === 'AUTO' ? 'AUTO' : 'MANUAL',
            ...(selected !== 'AUTO' ? { modelId: selected } : {}),
            ...(regenerate ? { regenerateMessageId: regenerate.id } : {}),
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message ?? 'Unable to send message.');
      }
      if (!response.body) throw new Error('Streaming is unavailable.');
      setText('');
      setMessages((previous) => [
        ...previous,
        ...(!regenerate
          ? [{ id: 'sending-user', role: 'user', content, status: 'SUCCEEDED' }]
          : []),
        { id: 'streaming', role: 'assistant', content: '', status: 'RESERVED' },
      ]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (!frame.startsWith('data: ')) continue;
          const event = JSON.parse(frame.slice(6));
          if (event.type === 'artifact')
            setMessages((old) =>
              old.map((m) =>
                m.id === 'streaming'
                  ? {
                      ...m,
                      artifacts: [...(m.artifacts ?? []), event.artifact],
                    }
                  : m,
              ),
            );
          if (event.type === 'delta')
            setMessages((old) =>
              old.map((m) =>
                m.id === 'streaming'
                  ? { ...m, content: m.content + event.text }
                  : m,
              ),
            );
          if (event.type === 'model')
            setMessages((old) =>
              old.map((m) =>
                m.id === 'streaming'
                  ? { ...m, modelName: event.model, routingMode: event.mode }
                  : m,
              ),
            );
          if (event.type === 'error') setError(event.message);
          if (event.type === 'done') {
            setUsage(event.usage);
            setMessages((old) =>
              old.map((m) =>
                m.id === 'streaming'
                  ? { ...m, status: event.status, id: event.messageId ?? m.id }
                  : m,
              ),
            );
          }
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setError(e instanceof Error ? e.message : 'Unable to send message.');
    } finally {
      setBusy(false);
      abort.current = null;
      if (conversationId) {
        const c = await apiRequest<{
          messages: Message[];
          attachments: ChatFile[];
        }>(`/workspace/conversations/${conversationId}`, {
          accessToken: accessToken ?? undefined,
        }).catch(() => null);
        if (c) {
          setMessages(c.messages);
          setFiles(c.attachments);
        }
      }
      void refresh().catch(() => {});
    }
  }
  async function attach(file?: File) {
    if (!file || !accessToken || busy) return;
    setError('');
    try {
      const conversationId = await ensureConversation();
      const body = new FormData();
      body.set('file', file);
      const added = await apiRequest<ChatFile>(
        `/workspace/conversations/${conversationId}/files`,
        { accessToken, method: 'POST', body },
      );
      setFiles((old) => [...old.filter((f) => f.id !== added.id), added]);
      setSelectedFiles((old) => [...old, added.id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    }
  }
  return (
    <div className={`chat-page ${!messages.length ? 'chat-is-new' : ''}`}>
      <header className="chat-toolbar">
        <div>
          <select
            aria-label="Choose AI model"
            value={selected}
            disabled={busy}
            onChange={(e) => {
              setSelected(e.target.value);
              setFeature('chat');
            }}
          >
            <option value="AUTO">Auto — Recommended</option>
            {[...new Set(models.map((m) => m.provider))].map((provider) => (
              <optgroup key={provider} label={provider}>
                {models
                  .filter((m) => m.provider === provider)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <span className="muted">{usage?.plan ?? 'Your workspace'}</span>
      </header>
      <details className="chat-options">
        <summary>
          <Icon name="settings" /> Conversation options
        </summary>
        {accessToken ? (
          <div className="chat-toolbar">
            <label>
              Project{' '}
              <select
                disabled={busy}
                value={projectId}
                onChange={async (e) => {
                  const next = e.target.value;
                  try {
                    if (id)
                      await apiRequest(`/workspace/conversations/${id}`, {
                        accessToken,
                        method: 'PATCH',
                        body: JSON.stringify({ projectId: next || null }),
                      });
                    setProjectId(next);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <option value="">Personal workspace</option>
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
        ) : (
          <p className="usage-hint">
            Temporary chat ·{' '}
            <SignInButton>Sign in to continue and save</SignInButton>
          </p>
        )}
        <div className="chat-toolbar">
          <label>
            Task{' '}
            <select
              aria-label="Choose task"
              value={feature}
              disabled={busy}
              onChange={(e) =>
                setFeature(e.target.value as 'chat' | 'image_generation')
              }
            >
              <option value="chat">Chat</option>
              <option
                value="image_generation"
                disabled={
                  !allowance?.allowedFeatures?.includes('image_generation') ||
                  (selected !== 'AUTO' &&
                    !models
                      .find((m) => m.id === selected)
                      ?.capabilities.includes('image_generation'))
                }
              >
                Generate image
              </option>
            </select>
          </label>
          <span className="muted">
            {selected === 'AUTO'
              ? 'Auto selects a model that supports this task.'
              : models.find((m) => m.id === selected)?.capabilities.join(', ')}
          </span>
        </div>
      </details>
      <div className="chat-scroll">
        {!messages.length ? (
          <section className="chat-welcome">
            <BrandMark className="welcome-mark" />
            <p className="eyebrow">ONE WORKSPACE. MORE POSSIBILITIES.</p>
            <h1>
              {user
                ? `Hello, ${preferences?.displayName || user.username}.`
                : 'A little help. A lot of possibility.'}
            </h1>
            <p className="muted">
              The right AI for <span className="teal-text">every task.</span>
            </p>
            <div className="available-models">
              <button
                className={`model-choice ${selected === 'AUTO' ? 'selected' : ''}`}
                disabled={busy}
                onClick={() => {
                  setSelected('AUTO');
                  setFeature('chat');
                }}
              >
                <ProviderIcon provider="auto" />
                <span>
                  <strong>Auto</strong>
                  <small>Best for your task</small>
                </span>
              </button>
              {models.map((model) => (
                <button
                  className={`model-choice ${selected === model.id ? 'selected' : ''}`}
                  key={model.id}
                  disabled={busy}
                  onClick={() => {
                    setSelected(model.id);
                    setFeature('chat');
                  }}
                >
                  <ProviderIcon provider={model.provider} />
                  <span>
                    <strong>{model.displayName}</strong>
                    <small>
                      {model.description || model.provider.toLowerCase()}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <div className="task-cards">
              {starterTasks.map((task) => (
                <button
                  key={task.key}
                  onClick={() => {
                    setText(
                      String(
                        settings[`workspace.${task.key}Prompt`] ||
                          `Help me ${task.title.toLowerCase()}.`,
                      ),
                    );
                    document
                      .querySelector<HTMLTextAreaElement>('.composer textarea')
                      ?.focus();
                  }}
                >
                  <span className={`task-icon ${task.key}`}>
                    <Icon name={task.icon} />
                  </span>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.detail}</small>
                  </span>
                  <span className="task-arrow">↗</span>
                </button>
              ))}
            </div>
            {recent.length > 0 && (
              <div className="panel">
                <p className="eyebrow">CONTINUE A CONVERSATION</p>
                {recent.slice(0, 3).map((c) => (
                  <button
                    className="row"
                    key={c.id}
                    onClick={() => router.push(`/chat?id=${c.id}`)}
                  >
                    {c.title} →
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <p className="eyebrow">{title}</p>
            {messages.map((m) => (
              <article className={`message ${m.role}`} key={m.id}>
                <p className="message-label">
                  {m.role === 'user'
                    ? 'You'
                    : `${m.routingMode === 'MANUAL' ? '' : 'Auto · '}${m.modelName ?? 'Vrompt'}`}
                </p>
                <pre>
                  {m.content ||
                    (m.artifacts?.length
                      ? ''
                      : m.status === 'RESERVED'
                        ? 'Thinking…'
                        : 'No response completed.')}
                </pre>
                {m.role === 'user' && (
                  <button disabled={busy} onClick={() => setText(m.content)}>
                    Edit as new message
                  </button>
                )}
                {m.artifacts?.map((a) => (
                  <GeneratedImage key={a.id} file={a} />
                ))}
                {m.role === 'assistant' &&
                  (m.content || Boolean(m.artifacts?.length)) && (
                    <div className="message-actions">
                      <button
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(m.content)
                            .catch(() =>
                              setError(
                                'Clipboard unavailable. Select the response text to copy it.',
                              ),
                            )
                        }
                      >
                        Copy response
                      </button>
                      <button
                        disabled={busy || !accessToken}
                        onClick={() => void send(m)}
                      >
                        Regenerate
                      </button>
                      {!['SUCCEEDED', 'RESERVED'].includes(m.status) && (
                        <span>{m.status.toLowerCase()}</span>
                      )}
                    </div>
                  )}
              </article>
            ))}
          </>
        )}
        <div ref={bottom} />
      </div>
      <div className="composer-wrap">
        {error && (
          <div className="error-banner" role="alert">
            {error}{' '}
            {selected !== 'AUTO' && (
              <button
                onClick={() => {
                  setSelected('AUTO');
                  setError('');
                }}
              >
                Use recommended alternative
              </button>
            )}
          </div>
        )}
        <div
          className="composer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void attach(e.dataTransfer.files[0]);
          }}
        >
          {files.map((f) => (
            <span className="file-chip" key={f.id}>
              <input
                type="checkbox"
                aria-label={`Include ${f.name}`}
                checked={selectedFiles.includes(f.id)}
                disabled={busy}
                onChange={(e) =>
                  setSelectedFiles((old) =>
                    e.target.checked
                      ? [...old, f.id]
                      : old.filter((x) => x !== f.id),
                  )
                }
              />
              {f.name}
              <button
                aria-label={`Remove ${f.name}`}
                disabled={busy}
                onClick={() =>
                  void apiRequest(`/workspace/files/${f.id}`, {
                    accessToken: accessToken!,
                    method: 'DELETE',
                  })
                    .then(() => {
                      setFiles((old) => old.filter((x) => x.id !== f.id));
                      setSelectedFiles((old) => old.filter((x) => x !== f.id));
                    })
                    .catch((e) => setError(e.message))
                }
              >
                ×
              </button>
            </span>
          ))}
          <textarea
            aria-label="Message"
            placeholder="What would you like to work on?"
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const image = [...e.clipboardData.items]
                .find(
                  (item) =>
                    item.kind === 'file' && item.type.startsWith('image/'),
                )
                ?.getAsFile();
              if (image) {
                e.preventDefault();
                void attach(image);
              }
            }}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                preferences?.sendOnEnter !== false &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="composer-controls">
            <div>
              <input
                type="file"
                hidden
                ref={upload}
                accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.csv"
                onChange={(e) => {
                  void attach(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <button
                aria-label="Attach a file"
                disabled={busy || !accessToken || !allowance?.maxFiles}
                onClick={() => upload.current?.click()}
              >
                <Icon name="attach" /> Attach
              </button>
              <select
                aria-label="Insert saved prompt"
                value=""
                onChange={(e) =>
                  setText(
                    (old) =>
                      `${old}${old ? '\n' : ''}${prompts.find((p) => p.id === e.target.value)?.content ?? ''}`,
                  )
                }
              >
                <option value="">Saved Prompts</option>
                {prompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            {busy ? (
              <button
                className="secondary-button"
                onClick={() => abort.current?.abort()}
              >
                Stop
              </button>
            ) : (
              <button
                className="primary-button"
                disabled={
                  !text.trim() ||
                  !allowance ||
                  allowance.dailyRemaining === 0 ||
                  allowance.monthlyRemaining === 0 ||
                  usage?.credits?.remaining === 0
                }
                onClick={() => void send()}
              >
                Send ↑
              </button>
            )}
          </div>
        </div>
        <p className="usage-hint">
          {usage?.credits &&
            `${usage.credits.remaining} credits remaining this month · `}
          {allowance
            ? `${allowance.dailyRemaining} / ${allowance.dailyLimit} remaining today · ${allowance.monthlyRemaining} / ${allowance.monthlyLimit} this month`
            : 'No allowance is configured for this selection.'}{' '}
          · AI can make mistakes.
        </p>
      </div>
    </div>
  );
}
