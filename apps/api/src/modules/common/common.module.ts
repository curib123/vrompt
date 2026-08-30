import { Global, Module } from '@nestjs/common';

import { MediaStorageModule } from './media-storage/media-storage.module';
import { MetricsService } from './metrics.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [MediaStorageModule],
  providers: [RedisService],
  exports: [MetricsService, RedisService],
})
export class CommonModule {}
