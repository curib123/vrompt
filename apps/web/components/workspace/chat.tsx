'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { Icon } from '@/components/ui/icon';
import { useFeedback } from '@/components/ui/feedback-modal';
import type { Preferences } from './preferences';
import { SignInButton } from '@/components/providers/auth-dialog-provider';
export function Chat() {
  const { accessToken, user } = useAuth();
  const { alert } = useFeedback();
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const newChat = params.get('new');
  const requestedModel = params.get('model');
  const [catalog, setCatalog] = useState<Model[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [selectionNotice, setSelectionNotice] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [preferences, setPreferences] = useState<Preferences>();
  const createdNavigation = useRef<string | null>(null);
  const modelChosenByUser = useRef(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [feature, setFeature] = useState<'chat' | 'image_generation'>('chat');
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState('AUTO');
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [usage, setUsage] = useState<Usage>();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('New conversation');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const viewVersion = useRef(0);
  const previousView = useRef<string | null>(null);
  const loadConversation = useEffectEvent((conversationId: string) =>
    apiRequest<Conversation & { messages: Message[]; attachments: ChatFile[] }>(
      `/workspace/conversations/${conversationId}`,
      { accessToken: accessToken! },
    ),
  );
  const bottom = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const allowance = usage?.allowances.find((a) => a.bucket === selected);
  const chatAvailable =
    catalog !== null &&
    !catalogError &&
    (selected === 'AUTO'
      ? catalog.some(
          (model) => model.available !== false && model.autoAvailable !== false,
        )
      : models.some((model) => model.id === selected));
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Model[]>('/catalog/models', { signal: controller.signal })
      .then((data) => {
        setCatalog(data);
        setCatalogError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogError(true);
      });
    return () => controller.abort();
  }, [availabilityAttempt]);
  async function refresh() {
    if (!accessToken) return;
    const options = { accessToken };
    const [m, u, p] = await Promise.all([
      apiRequest<Model[]>('/workspace/models', options),
      apiRequest<Usage>('/workspace/usage', options),
      apiRequest<SavedPrompt[]>('/workspace/saved-prompts', options),
    ]);
    setModels(m);
    setUsage(u);
    setPrompts(p);
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
  }, [accessToken, availabilityAttempt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (createdNavigation.current === id && id) {
      createdNavigation.current = null;
      return;
    }
    viewVersion.current += 1;
    abort.current?.abort();
    abort.current = null;
    // A route change starts a separate conversation, including a second New Chat click.
    setBusy(false);
    const view = `${user?.id ?? 'guest'}:${id ?? ''}:${newChat ?? ''}`;
    if (previousView.current !== view) {
      setText('');
      previousView.current = view;
    }
    setFeature('chat');
    setSelectionNotice('');
    const inserted = sessionStorage.getItem('vrompt-insert-prompt');
    // Synchronize a prompt handed off through browser session storage.
    if (inserted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setText(inserted);
      sessionStorage.removeItem('vrompt-insert-prompt');
    }
    let current = true;
    modelChosenByUser.current = false;
    setError('');
    setSelected('AUTO');
    setMessages([]);
    setFiles([]);
    setSelectedFiles([]);
    if (!id) {
      setProjectId(params.get('project') ?? '');
      setTitle('New conversation');
      return;
    }
    if (!user) return;
    void loadConversation(id)
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
  }, [id, newChat, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // A direct model link is an explicit selection; otherwise every new chat is Auto.
    if (
      !id &&
      !createdNavigation.current &&
      !modelChosenByUser.current &&
      preferences &&
      catalog
    ) {
      setSelected(
        requestedModel === 'AUTO'
          ? 'AUTO'
          : models.some((model) => model.id === requestedModel)
            ? requestedModel!
            : 'AUTO',
      );
      if (
        requestedModel &&
        requestedModel !== 'AUTO' &&
        !models.some((model) => model.id === requestedModel)
      ) {
        const requested = catalog.find((model) => model.id === requestedModel);
        // The notice mirrors a URL model request after catalog data arrives.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectionNotice(
          requested?.available === false
            ? `${requested.displayName} is temporarily unavailable. You can keep your draft and try again later.`
            : 'This model is not included in your current allowance. Start with Auto or compare upgrade options.',
        );
      } else setSelectionNotice('');
    }
  }, [id, newChat, preferences, models, requestedModel, catalog]);
  useEffect(() => {
    if (messages.length) bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  useEffect(() => () => abort.current?.abort(), []);
  async function ensureConversation() {
    if (id) return id;
    const version = viewVersion.current;
    const c = await apiRequest<Conversation>('/workspace/conversations', {
      accessToken: accessToken!,
      method: 'POST',
      body: JSON.stringify({
        title: text.trim().slice(0, 80) || 'New conversation',
        projectId: projectId || null,
      }),
    });
    if (version !== viewVersion.current)
      throw new DOMException('Conversation changed', 'AbortError');
    createdNavigation.current = c.id;
    setTitle(c.title);
    router.replace(`/chat?id=${c.id}`);
    return c.id;
  }
  async function send(regenerate?: Message) {
    if (
      abort.current ||
      busy ||
      !chatAvailable ||
      (!text.trim() && !regenerate)
    )
      return;
    const version = viewVersion.current;
    setBusy(true);
    setError('');
    const content = regenerate ? 'Regenerate' : text.trim();
    const controller = new AbortController();
    abort.current = controller;
    let conversationId = id;
    try {
      conversationId = accessToken ? await ensureConversation() : null;
      if (controller.signal.aborted) return;
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
        if (response.status === 401 && accessToken)
          window.dispatchEvent(
            new CustomEvent('vrompt:session-expired', { detail: accessToken }),
          );
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
      let completed = false;
      while (true) {
        const { value, done } = await reader.read();
        if (version !== viewVersion.current) return;
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
            completed = true;
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
      if (!completed)
        throw new Error(
          'The connection ended before the response finished. Please retry.',
        );
    } catch (e) {
      if (version !== viewVersion.current) return;
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        const message =
          e instanceof Error ? e.message : 'Unable to send message.';
        setError(message);
        alert({ tone: 'error', title: 'Message could not be sent', message });
      }
    } finally {
      if (version !== viewVersion.current) return;
      setBusy(false);
      abort.current = null;
      if (conversationId) {
        const c = await apiRequest<{
          messages: Message[];
          attachments: ChatFile[];
        }>(`/workspace/conversations/${conversationId}`, {
          accessToken: accessToken ?? undefined,
        }).catch(() => null);
        if (c && version === viewVersion.current) {
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
      const message = e instanceof Error ? e.message : 'Upload failed.';
      setError(message);
      alert({ tone: 'error', title: 'File could not be uploaded', message });
    }
  }
  return (
    <div className={`chat-page ${!messages.length ? 'chat-is-new' : ''}`}>
      <header className="chat-toolbar">
        <div className="chat-toolbar-title">
          <span className="eyebrow">YOUR WORKSPACE</span>
          <strong>{id ? title : 'New chat'}</strong>
        </div>
        <div className="chat-model-picker">
          <select
            aria-label="Choose AI model"
            value={selected}
            disabled={busy}
            onChange={(e) => {
              modelChosenByUser.current = true;
              setSelectionNotice('');
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
      {selectionNotice && (
        <div className="service-notice">
          <div>
            <p>{selectionNotice}</p>
            <Link href="/billing" className="text-link">
              Compare plans <Icon name="arrow" />
            </Link>
          </div>
        </div>
      )}
      {(catalogError || (catalog !== null && !chatAvailable)) && (
        <div className="service-notice" role="status">
          <Icon name="chat" />
          <div>
            <strong>AI chat is temporarily unavailable.</strong>
            <p>
              You can write your next prompt, explore your workspace, and try
              again later. No credits are used while chat is unavailable.
            </p>
            <button
              className="text-link"
              onClick={() => setAvailabilityAttempt((value) => value + 1)}
            >
              Check availability
            </button>
          </div>
        </div>
      )}
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
            <p className="eyebrow">READY WHEN YOU ARE</p>
            <h1 className="chat-welcome-title">
              {user
                ? `Hello, ${preferences?.displayName || user.username}.`
                : 'What would you like to work on?'}
            </h1>
            <p className="muted chat-welcome-subtitle">
              Start with <strong>Auto · Recommended</strong>, or choose a model
              from the menu above whenever you need more control.
            </p>
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
                {m.role === 'assistant' && m.status !== 'RESERVED' && (
                  <div className="message-actions">
                    {m.content && (
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
                    )}
                    <button
                      disabled={busy || !accessToken}
                      onClick={() => void send(m)}
                    >
                      {m.status === 'SUCCEEDED'
                        ? 'Regenerate'
                        : 'Retry response'}
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
                  !chatAvailable ||
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
