import { render, screen } from '@testing-library/react';
import { GeneratedImage } from '@/components/workspace/generated-image';

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
}));

describe('GeneratedImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads privately and releases its download URL on unmount', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, blob: async () => new Blob(['image']) });
    const create = vi.fn().mockReturnValue('blob:test-image');
    const revoke = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const { unmount } = render(
      <GeneratedImage
        file={{
          id: 'image-id',
          name: 'image.png',
          mimeType: 'image/png',
          size: 5,
        }}
      />,
    );
    expect(await screen.findByRole('img')).toHaveAttribute(
      'src',
      'blob:test-image',
    );
    expect(
      screen.getByRole('link', { name: 'Download image' }),
    ).toHaveAttribute('download', 'image.png');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/workspace/files/image-id'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    );
    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:test-image');
  });

  it('shows an error when private access fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    render(
      <GeneratedImage
        file={{
          id: 'image-id',
          name: 'image.png',
          mimeType: 'image/png',
          size: 5,
        }}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Image could not be loaded.',
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
});
