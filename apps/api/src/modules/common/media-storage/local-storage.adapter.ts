import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '@prisma/client';

import type {
  MediaStorageAdapter,
  MediaUploadInput,
  StoredMedia,
} from './media-storage.types';

@Injectable()
export class LocalStorageAdapter implements MediaStorageAdapter {
  readonly provider = StorageProvider.LOCAL;
  private readonly directory: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.directory = resolve(
      this.configService.get<string>('MEDIA_STORAGE_LOCAL_DIR', './storage'),
    );
    this.publicUrl = configService.get<string>(
      'MEDIA_STORAGE_LOCAL_PUBLIC_URL',
      '/media',
    );
  }

  async upload(input: MediaUploadInput): Promise<StoredMedia> {
    await mkdir(this.directory, { recursive: true });

    const extension = extname(basename(input.filename)).toLowerCase();
    const storageKey = `${randomUUID()}${extension}`;

    await writeFile(join(this.directory, storageKey), input.buffer, {
      flag: 'wx',
    });

    return {
      provider: this.provider,
      storageKey,
      secureUrl: `${this.publicUrl}/${encodeURIComponent(storageKey)}`,
    };
  }

  async delete(storageKey: string) {
    const safeKey = basename(storageKey);

    try {
      await unlink(join(this.directory, safeKey));
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw error;
    }
  }
}
