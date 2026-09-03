import React from 'react';
import { render, screen } from '@testing-library/react';

import LandingPage from '@/app/landing/page';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders visible label text', () => {
    render(<Badge>Monochrome</Badge>);

    expect(screen.getByText('Monochrome')).toBeVisible();
  });
});

describe('Landing page', () => {
  it('immediately explains that Vrompt is a prompt repository', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /structured AI prompts that work.*generate them.*find them.*improve them/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/Turn your goal into a structured, effective AI prompt/i),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /explore prompts/i }),
    ).toHaveAttribute('href', '/explore');
    expect(
      screen.getByRole('heading', {
        name: /every prompt has a home, history, and source/i,
      }),
    ).toBeVisible();
  });
});
