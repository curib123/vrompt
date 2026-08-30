import React from 'react';
import { render, screen } from '@testing-library/react';

import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders visible label text', () => {
    render(<Badge>Monochrome</Badge>);

    expect(screen.getByText('Monochrome')).toBeVisible();
  });
});
