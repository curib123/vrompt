import { Injectable, NotImplementedException } from '@nestjs/common';
import { StorageProvider } from '@prisma/client';

import type {
  MediaStorageAdapter,
  MediaUploadInput,
  StoredMedia,
} from './media-storage.types';

@Injectable()
export class CloudinaryStorageAdapter implements MediaStorageAdapter {
  readonly provider = StorageProvider.CLOUDINARY;

  async upload(_input: MediaUploadInput): Promise<StoredMedia> {
    throw new NotImplementedException(
      'Cloudinary uploads require provider credentials and are enabled in a later deployment configuration.',
    );
  }

  async delete(_storageKey: string) {
    throw new NotImplementedException(
      'Cloudinary deletion requires provider credentials and is not enabled yet.',
    );
  }
}
