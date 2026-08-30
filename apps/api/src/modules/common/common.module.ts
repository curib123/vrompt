import { Global, Module } from '@nestjs/common';

import { MediaStorageModule } from './media-storage/media-storage.module';
import { MetricsModule } from './metrics.module';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [MediaStorageModule, MetricsModule],
  providers: [RedisService],
  exports: [MetricsModule, RedisService],
})
export class CommonModule {}
