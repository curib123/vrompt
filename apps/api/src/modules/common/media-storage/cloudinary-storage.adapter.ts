import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageProvider } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';

import type {
  MediaStorageAdapter,
  MediaUploadInput,
  StoredMedia,
} from './media-storage.types';

@Injectable()
export class CloudinaryStorageAdapter implements MediaStorageAdapter {
  readonly provider = StorageProvider.CLOUDINARY;

  constructor(private readonly configService: ConfigService) {}

  async upload(input: MediaUploadInput): Promise<StoredMedia> {
    this.configure();

    const result = await new Promise<{
      public_id: string;
      secure_url: string;
    }>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: 'vrompt/evidence',
          public_id: randomUUID(),
          resource_type: 'image',
          overwrite: false,
          invalidate: true,
        },
        (error, response) => {
          if (error || !response) {
            reject(
              error ?? new Error('Cloudinary upload returned no response'),
            );
            return;
          }

          resolve(response);
        },
      );
      upload.end(input.buffer);
    });

    return {
      provider: this.provider,
      storageKey: result.public_id,
      secureUrl: result.secure_url,
    };
  }

  async delete(storageKey: string) {
    this.configure();
    const result = await cloudinary.uploader.destroy(storageKey, {
      invalidate: true,
      resource_type: 'image',
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary deletion failed: ${result.result}`);
    }
  }

  private configure() {
    cloudinary.config({
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      secure: true,
    });
  }
}
