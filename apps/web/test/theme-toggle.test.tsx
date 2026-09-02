import { fireEvent, render, screen } from '@testing-library/react';

import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';

describe('theme toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: true,
        removeEventListener: vi.fn(),
      }),
    });
  });

  it('starts from the system theme and toggles to an explicit light theme', async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await vi.waitFor(() =>
      expect(screen.getByRole('button')).toHaveAccessibleName(
        'Switch to light mode',
      ),
    );
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Switch to dark mode',
    );
    expect(document.documentElement).toHaveClass('light');
    expect(window.localStorage.getItem('vrompt-theme')).toBe('light');
  });
});
