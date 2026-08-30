import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ConfigService } from '@nestjs/config';

import { LocalStorageAdapter } from './local-storage.adapter';

describe('LocalStorageAdapter', () => {
  it('uses a generated safe key even for a traversal-looking filename', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'vrompt-storage-'));
    const config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'MEDIA_STORAGE_LOCAL_DIR' ? directory : fallback,
      ),
    };

    try {
      const adapter = new LocalStorageAdapter(
        config as unknown as ConfigService,
      );
      const stored = await adapter.upload({
        buffer: Buffer.from('safe'),
        contentType: 'image/png',
        filename: '../../outside.png',
      });

      expect(stored.storageKey).toMatch(/^[0-9a-f-]+\.png$/);
      await expect(
        readFile(join(directory, stored.storageKey)),
      ).resolves.toEqual(Buffer.from('safe'));
      await adapter.delete(stored.storageKey);
      await expect(
        readFile(join(directory, stored.storageKey)),
      ).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
