import { fireEvent, render, screen } from '@testing-library/react';

import { Avatar } from '@/components/ui/avatar';

describe('Avatar', () => {
  it('shows initials when no image is available', () => {
    render(<Avatar name="Aisha Abbas" />);

    expect(
      screen.getByRole('img', { name: 'Aisha Abbas avatar' }),
    ).toHaveTextContent('AA');
  });

  it('falls back to initials when the avatar image fails', () => {
    const { container } = render(
      <Avatar avatar="https://example.test/broken.jpg" name="Aisha Abbas" />,
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('img', { name: 'Aisha Abbas avatar' }),
    ).toHaveTextContent('AA');
  });

  it('tries a new image after a failed URL changes', () => {
    const { container, rerender } = render(
      <Avatar avatar="https://example.test/broken.jpg" name="Aisha Abbas" />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    rerender(
      <Avatar
        avatar="https://example.test/replacement.jpg"
        name="Aisha Abbas"
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://example.test/replacement.jpg',
    );
  });
});
