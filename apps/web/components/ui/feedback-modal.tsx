'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export type AlertTone = 'success' | 'warning' | 'error';

export type AlertInput = {
  tone: AlertTone;
  title: string;
  message: string;
  actionLabel?: string;
};

export type ConfirmInput = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const toneDetails: Record<
  AlertTone,
  { icon: 'check' | 'warning' | 'error'; label: string }
> = {
  success: { icon: 'check', label: 'Success' },
  warning: { icon: 'warning', label: 'Warning' },
  error: { icon: 'error', label: 'Error' },
};

export function AlertModal({
  actionLabel = 'Done',
  message,
  onClose,
  open,
  title,
  tone,
}: AlertInput & { open: boolean; onClose: () => void }) {
  const detail = toneDetails[tone];
  return (
    <Modal
      className="feedback-modal"
      description={message}
      onClose={onClose}
      open={open}
      title={title}
    >
      <div className={`feedback-modal-body feedback-modal-${tone}`}>
        <div
          className="feedback-modal-icon"
          aria-label={detail.label}
          role="img"
        >
          <Icon name={detail.icon} />
        </div>
        <div className="form-actions feedback-modal-actions">
          <Button onClick={onClose}>{actionLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function ConfirmModal({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  destructive = false,
  message,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmInput & {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      className="feedback-modal"
      description={message}
      onClose={() => {
        if (!busy) onClose();
      }}
      open={open}
      title={title}
    >
      <div className="feedback-modal-body feedback-modal-warning">
        <div className="feedback-modal-icon" aria-label="Warning" role="img">
          <Icon name="warning" />
        </div>
        <div className="form-actions feedback-modal-actions">
          <Button disabled={busy} onClick={onClose} variant="secondary">
            {cancelLabel}
          </Button>
          <Button
            className={destructive ? 'feedback-destructive-button' : undefined}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type Dialog =
  | { kind: 'alert'; input: AlertInput }
  | { kind: 'confirm'; input: ConfirmInput };

type FeedbackContextValue = {
  alert: (input: AlertInput) => void;
  confirm: (input: ConfirmInput) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const closeConfirm = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const alert = useCallback((input: AlertInput) => {
    setDialog({ kind: 'alert', input });
  }, []);

  const confirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setDialog({ kind: 'confirm', input });
    });
  }, []);

  return (
    <FeedbackContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog?.kind === 'alert' && (
        <AlertModal {...dialog.input} onClose={() => setDialog(null)} open />
      )}
      {dialog?.kind === 'confirm' && (
        <ConfirmModal
          {...dialog.input}
          onClose={() => closeConfirm(false)}
          onConfirm={() => closeConfirm(true)}
          open
        />
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider');
  }
  return context;
}
