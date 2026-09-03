'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import type { AdminAiGeneration, AiGenerationResponse } from '@/lib/api';

export function AdminAiStudio() {
  const { accessToken } = useAuth();
  const [goal, setGoal] = useState('');
  const [batchGoals, setBatchGoals] = useState('');
  const [items, setItems] = useState<AdminAiGeneration[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const result = await apiRequest<AdminAiGeneration[]>(
      '/admin/ai/generations',
      { accessToken },
    );
    setItems(result);
  }, [accessToken]);

  useEffect(() => {
    // The history request hydrates state from the authenticated API session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => undefined);
  }, [load]);

  async function generate() {
    if (!accessToken || goal.trim().length < 10) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest<AiGenerationResponse>('/admin/ai/generate', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ goal, requestId: crypto.randomUUID() }),
      });
      setGoal('');
      setMessage('Draft generated. Save it to the review queue when ready.');
      await load();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Generation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function batchGenerate() {
    if (!accessToken) return;
    const goals = batchGoals
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (goals.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest('/admin/ai/batch', {
        accessToken,
        method: 'POST',
        body: JSON.stringify({ goals }),
      });
      setBatchGoals('');
      setMessage(`${goals.length} controlled draft request(s) completed.`);
      await load();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : 'Batch generation failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function action(
    id: string,
    path: 'save-draft' | 'review',
    body?: object,
  ) {
    if (!accessToken) return;
    try {
      await apiRequest(`/admin/ai/generations/${id}/${path}`, {
        accessToken,
        method: path === 'review' ? 'PATCH' : 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      await load();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Action failed.');
    }
  }

  return (
    <div className="grid gap-6">
      <header>
        <Badge>Internal AI studio</Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
          Generate library drafts.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-mid">
          Generated prompts stay private drafts until a staff member reviews and
          publishes them.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Single generation</h2>
          <Textarea
            className="mt-4"
            onChange={(event) => setGoal(event.target.value)}
            placeholder="Describe a useful prompt gap for the library..."
            value={goal}
          />
          <Button
            className="mt-3"
            disabled={busy || goal.trim().length < 10}
            onClick={() => void generate()}
          >
            Generate draft
          </Button>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Controlled batch</h2>
          <p className="mt-2 text-sm text-brand-mid">
            One topic per line, up to 10 lines. Nothing publishes automatically.
          </p>
          <Textarea
            className="mt-4"
            onChange={(event) => setBatchGoals(event.target.value)}
            placeholder={'SEO audit checklist\nCustomer interview synthesis'}
            value={batchGoals}
          />
          <Button
            className="mt-3"
            disabled={busy || !batchGoals.trim()}
            onClick={() => void batchGenerate()}
            variant="secondary"
          >
            Generate batch
          </Button>
        </Card>
      </div>
      {message ? (
        <p
          className="rounded-2xl border border-zinc-200 p-4 text-sm dark:border-zinc-800"
          role="status"
        >
          {message}
        </p>
      ) : null}
      <section className="grid gap-4" aria-labelledby="generation-history">
        <h2 className="text-2xl font-semibold" id="generation-history">
          Generation history
        </h2>
        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-brand-mid">
              No internal generations yet.
            </p>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge>{item.status}</Badge>
                  <h3 className="mt-3 text-xl font-semibold">
                    {item.output?.title ?? 'Generation result'}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-brand-mid">
                    {item.goal}
                  </p>
                </div>
                <p className="text-xs text-brand-mid">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              {item.output ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Preview prompt
                  </summary>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-200">
                    {item.output.content}
                  </pre>
                </details>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {!item.repositoryId ? (
                  <Button
                    onClick={() => void action(item.id, 'save-draft')}
                    variant="secondary"
                  >
                    Save as draft
                  </Button>
                ) : null}
                {item.repository?.visibility === 'PRIVATE' ? (
                  <Button
                    onClick={() =>
                      void action(item.id, 'review', { action: 'PUBLISH' })
                    }
                  >
                    Approve and publish
                  </Button>
                ) : null}
                <Button
                  onClick={() =>
                    void action(item.id, 'review', { action: 'REJECT' })
                  }
                  variant="ghost"
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
