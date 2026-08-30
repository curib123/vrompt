import { Global, Module } from '@nestjs/common';

import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import { MediaStorageService } from './media-storage.service';

@Global()
@Module({
  providers: [
    CloudinaryStorageAdapter,
    LocalStorageAdapter,
    MediaStorageService,
  ],
  exports: [MediaStorageService],
})
export class MediaStorageModule {}
