import { BadRequestException } from '@nestjs/common';

const supportedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function assertSupportedImageSignature(
  contentType: string,
  buffer: Buffer,
) {
  if (!supportedImageTypes.has(contentType)) {
    throw new BadRequestException(
      'Evidence must be a JPEG, PNG, or WebP image',
    );
  }

  const isJpeg =
    buffer.length >= 3 &&
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isPng =
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  const matches =
    (contentType === 'image/jpeg' && isJpeg) ||
    (contentType === 'image/png' && isPng) ||
    (contentType === 'image/webp' && isWebp);

  if (!matches) {
    throw new BadRequestException(
      'The file contents do not match its image type',
    );
  }
}
