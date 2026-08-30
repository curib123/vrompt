import { StorageProvider } from '@prisma/client';

export interface MediaUploadInput {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export interface StoredMedia {
  provider: StorageProvider;
  storageKey: string;
  secureUrl: string;
}

export interface MediaStorageAdapter {
  readonly provider: StorageProvider;
  delete(storageKey: string): Promise<void>;
  upload(input: MediaUploadInput): Promise<StoredMedia>;
}
