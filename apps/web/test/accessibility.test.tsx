import { fireEvent, render, screen } from '@testing-library/react';

import { Modal } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';

describe('shared accessibility primitives', () => {
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

  it('moves between tabs with arrow keys', () => {
    render(
      <Tabs
        items={[
          { content: 'Overview content', id: 'overview', label: 'Overview' },
          { content: 'Prompt content', id: 'prompt', label: 'Prompt' },
        ]}
      />,
    );

    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();
    fireEvent.keyDown(overview, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Prompt' })).toHaveFocus();
    expect(screen.getByText('Prompt content')).toBeVisible();
  });
});
