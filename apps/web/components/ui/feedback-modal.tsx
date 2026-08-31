'use client';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export function AlertModal({
  description,
  onClose,
  open,
  title = 'Something needs your attention',
}: {
  description: string;
  onClose: () => void;
  open: boolean;
  title?: string;
}) {
  return (
    <Modal
      description={description}
      onClose={onClose}
      open={open}
      title={title}
    >
      <div className="flex justify-end">
        <Button onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
}

export function ConfirmationModal({
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  description,
  destructive = false,
  isConfirming = false,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  destructive?: boolean;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Modal
      className="max-w-md"
      description={description}
      onClose={onCancel}
      open={open}
      title={title}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button disabled={isConfirming} onClick={onCancel} variant="secondary">
          {cancelLabel}
        </Button>
        <Button
          className={
            destructive
              ? 'bg-red-600 !text-white hover:bg-red-700 focus-visible:outline-red-600 dark:bg-red-600 dark:!text-white dark:hover:bg-red-700'
              : undefined
          }
          disabled={isConfirming}
          onClick={onConfirm}
        >
          {isConfirming ? 'Working...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
