import { Global, Module } from '@nestjs/common';

import { CloudinaryStorageAdapter } from './cloudinary-storage.adapter';
import { LocalStorageAdapter } from './local-storage.adapter';
import { MediaStorageService } from './media-storage.service';
import { MetricsModule } from '../metrics.module';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [
    CloudinaryStorageAdapter,
    LocalStorageAdapter,
    MediaStorageService,
  ],
  exports: [MediaStorageService],
})
export class MediaStorageModule {}
