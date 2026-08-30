import { Global, Module } from '@nestjs/common';

import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import { MediaStorageService } from './media-storage.service';
import { MetricsService } from '../metrics.service';

@Global()
@Module({
  providers: [
    CloudinaryStorageAdapter,
    LocalStorageAdapter,
    MediaStorageService,
    MetricsService,
  ],
  exports: [MediaStorageService, MetricsService],
})
export class MediaStorageModule {}
