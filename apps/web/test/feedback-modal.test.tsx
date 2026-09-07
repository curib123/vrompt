import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AlertModal,
  ConfirmModal,
  FeedbackProvider,
  useFeedback,
} from '@/components/ui/feedback-modal';

describe('feedback modal primitives', () => {
  it('announces success without moving focus or blocking the next action', () => {
    function Save() {
      const { alert } = useFeedback();
      return (
        <button
          onClick={() =>
            alert({ tone: 'success', title: 'Saved', message: 'Ready to use.' })
          }
        >
          Save
        </button>
      );
    }
    render(
      <FeedbackProvider>
        <Save />
      </FeedbackProvider>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    button.focus();
    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(button).toHaveFocus();
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
  it.each([
    ['success', 'Success'],
    ['warning', 'Warning'],
    ['error', 'Error'],
  ] as const)('renders the %s alert tone', (tone, label) => {
    render(
      <AlertModal
        message="A status message"
        onClose={() => undefined}
        open
        title="Status"
        tone={tone}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Status' })).toBeVisible();
    expect(screen.getByRole('img', { name: label })).toBeVisible();
  });

  it('runs a confirmation action and supports cancel', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmModal
        confirmLabel="Delete"
        message="This cannot be undone."
        onClose={onClose}
        onConfirm={onConfirm}
        open
        title="Delete item?"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
  });

  it('exposes alert and confirmation actions through the app provider', async () => {
    function Trigger() {
      const { alert, confirm } = useFeedback();
      return (
        <>
          <button
            onClick={() =>
              alert({
                tone: 'warning',
                title: 'Heads up',
                message: 'Check this.',
              })
            }
            type="button"
          >
            Show alert
          </button>
          <button
            onClick={() =>
              void confirm({ title: 'Continue?', message: 'Ready?' })
            }
            type="button"
          >
            Ask
          </button>
        </>
      );
    }

    render(
      <FeedbackProvider>
        <Trigger />
      </FeedbackProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show alert' }));
    expect(screen.getByRole('dialog', { name: 'Heads up' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog', { name: 'Heads up' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(screen.getByRole('dialog', { name: 'Continue?' })).toBeVisible();
  });
});
