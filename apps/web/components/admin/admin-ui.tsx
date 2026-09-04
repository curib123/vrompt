'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/cn';

export function AdminPageHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-[#E6E6E6] pb-6 dark:border-[#292929] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-mid">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-mid">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function AdminNotice({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'error' | 'success' | 'neutral';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        tone === 'error' &&
          'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
        tone === 'success' &&
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
        tone === 'neutral' &&
          'border-[#E6E6E6] bg-[#F7F7F5] text-brand-mid dark:border-[#292929] dark:bg-[#171717]',
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

export function AdminLoading({ label = 'Loading data' }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      className="grid gap-3"
      role="status"
    >
      <span className="sr-only">{label}…</span>
      {[0, 1, 2].map((item) => (
        <Card
          className="h-24 animate-pulse bg-[#F4F4F2] dark:bg-[#202020]"
          key={item}
        >
          <span className="sr-only">Loading</span>
        </Card>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  busy,
  confirmLabel,
  description,
  onClose,
  onConfirm,
  open,
  title,
}: {
  busy?: boolean;
  confirmLabel: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Modal
      description={description}
      onClose={onClose}
      open={open}
      title={title}
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={busy} onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button
          className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export function AdminPagination({
  hasNextPage,
  onPageChange,
  page,
  total,
}: {
  hasNextPage: boolean;
  onPageChange: (page: number) => void;
  page: number;
  total?: number;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E6E6] pt-4 dark:border-[#292929]"
    >
      <p className="text-sm text-brand-mid">
        Page {page}
        {total === undefined ? '' : ` · ${total.toLocaleString()} total`}
      </p>
      <div className="flex gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          variant="secondary"
        >
          Previous
        </Button>
        <Button
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          variant="secondary"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
