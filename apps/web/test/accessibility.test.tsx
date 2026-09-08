import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/ui/modal';
describe('shared accessibility primitives', () => {
  it('skips controls in disabled fieldsets and collapsed advanced settings', () => {
    render(
      <Modal
        description="Configuration"
        title="Edit configuration"
        open
        onClose={() => undefined}
      >
        <button type="button">Save</button>
        <details>
          <summary>Advanced settings</summary>
          <input aria-label="Hidden setting" />
        </details>
        <fieldset disabled>
          <button type="button">Unavailable action</button>
        </fieldset>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Advanced settings')).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(
      screen.getByRole('button', { name: 'Close' }),
    ).toHaveFocus();
  });
  it('keeps keyboard focus inside an open modal', () => {
    const onClose = vi.fn();
    render(
      <>
        <button onClick={() => undefined} type="button">
          Open
        </button>
        <Modal
          description="Dialog description"
          onClose={onClose}
          open
          title="Accessible dialog"
        >
          <button onClick={onClose} type="button">
            Confirm
          </button>
        </Modal>
      </>,
    );

    expect(
      screen.getByRole('dialog', { name: 'Accessible dialog' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
  });

  it('renders modals at the document root instead of inside their trigger layout', () => {
    render(
      <header data-testid="sticky-header">
        <Modal
          description="Dialog description"
          onClose={() => undefined}
          open
          title="Portal dialog"
        >
          <button type="button">Confirm</button>
        </Modal>
      </header>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Portal dialog' });
    expect(dialog.closest('[data-testid="sticky-header"]')).toBeNull();
    expect(dialog.parentElement).toBe(document.body);
  });
});
