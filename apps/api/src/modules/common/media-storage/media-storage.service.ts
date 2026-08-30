import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '@prisma/client';

import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import type {
  MediaStorageAdapter,
  MediaUploadInput,
} from './media-storage.types';

@Injectable()
export class MediaStorageService {
  private readonly adapters: Map<StorageProvider, MediaStorageAdapter>;

  constructor(
    private readonly configService: ConfigService,
    localStorageAdapter: LocalStorageAdapter,
    cloudinaryStorageAdapter: CloudinaryStorageAdapter,
  ) {
    this.adapters = new Map<StorageProvider, MediaStorageAdapter>([
      [StorageProvider.LOCAL, localStorageAdapter],
      [StorageProvider.CLOUDINARY, cloudinaryStorageAdapter],
    ]);
  }

  private get provider() {
    const configuredProvider = this.configService.get<string>(
      'MEDIA_STORAGE_PROVIDER',
      StorageProvider.LOCAL,
    );

    if (
      !Object.values(StorageProvider).includes(
        configuredProvider as StorageProvider,
      )
    ) {
      throw new InternalServerErrorException(
        `Unsupported media storage provider: ${configuredProvider}`,
      );
    }

    return configuredProvider as StorageProvider;
  }

  upload(input: MediaUploadInput) {
    const adapter = this.adapters.get(this.provider);

    if (!adapter) {
      throw new InternalServerErrorException(
        'Media storage adapter is unavailable',
      );
    }

    return adapter.upload(input);
  }

  delete(storageKey: string, provider = this.provider) {
    const adapter = this.adapters.get(provider);

    if (!adapter) {
      throw new InternalServerErrorException(
        'Media storage adapter is unavailable',
      );
    }

    return adapter.delete(storageKey);
  }
}
