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
  it('immediately explains that Vrompt turns repeated tasks into workflows', () => {
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /turn repeated AI tasks into reusable workflows.*create them.*use them.*make them better/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Create, save, organize, improve, and reuse your best prompts/i,
      ),
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
