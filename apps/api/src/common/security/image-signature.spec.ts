import { BadRequestException } from '@nestjs/common';

import { assertSupportedImageSignature } from './image-signature';

describe('assertSupportedImageSignature', () => {
  it('accepts matching PNG bytes', () => {
    expect(() =>
      assertSupportedImageSignature(
        'image/png',
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).not.toThrow();
  });

  it('rejects a MIME-spoofed upload', () => {
    expect(() =>
      assertSupportedImageSignature('image/png', Buffer.from('not-an-image')),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported image formats', () => {
    expect(() =>
      assertSupportedImageSignature('image/gif', Buffer.from('GIF89a')),
    ).toThrow('JPEG, PNG, or WebP');
  });
});
