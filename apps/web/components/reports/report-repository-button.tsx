'use client';

import { useState } from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/api';
import type { ReportResponse } from '@/lib/api';

const reasons = [
  ['SPAM', 'Spam'],
  ['SCAM', 'Scam'],
  ['MISLEADING', 'Misleading'],
  ['MISLEADING_EVIDENCE', 'Misleading evidence'],
  ['COPYRIGHT', 'Copyright'],
  ['HARASSMENT', 'Harassment'],
  ['UNSAFE_CONTENT', 'Unsafe content'],
  ['ADULT_CONTENT', 'Adult content'],
  ['OTHER', 'Other'],
] as const;

export function ReportRepositoryButton({
  repositoryId,
}: {
  repositoryId: string;
}) {
  const { accessToken, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>('SPAM');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || state === 'sending') return;
    setState('sending');
    try {
      await apiRequest<ReportResponse>('/reports', {
        accessToken,
        body: JSON.stringify({
          description,
          reason,
          targetId: repositoryId,
          targetType: 'REPOSITORY',
        }),
        method: 'POST',
      });
      setState('sent');
    } catch {
      setState('error');
    }
  }

  if (!user) return null;
  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
          setState('idle');
        }}
        variant="ghost"
      >
        Report
      </Button>
      <Modal
        description="Reports help moderators review content. A single report does not automatically remove anything."
        onClose={() => setOpen(false)}
        open={open}
        title="Report repository"
      >
        <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
          {state === 'sent' ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Thanks. Your report is in the moderator queue.
            </p>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-medium">
                Reason
                <select
                  className="min-h-11 rounded-2xl border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-950"
                  onChange={(event) =>
                    setReason(event.target.value as (typeof reasons)[number][0])
                  }
                  value={reason}
                >
                  {reasons.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Textarea
                aria-label="Report description"
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional context"
                value={description}
              />
              {state === 'error' ? (
                <p
                  aria-live="assertive"
                  className="text-sm text-red-600"
                  role="alert"
                >
                  Report could not be submitted. You may already have reported
                  this recently.
                </p>
              ) : null}
              <Button disabled={state === 'sending'} type="submit">
                {state === 'sending' ? 'Submitting...' : 'Submit report'}
              </Button>
            </>
          )}
        </form>
      </Modal>
    </>
  );
}
