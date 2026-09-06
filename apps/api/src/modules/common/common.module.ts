import { Global, Module } from '@nestjs/common';

import { MetricsModule } from './metrics.module';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [MetricsModule],
  providers: [RedisService],
  exports: [MetricsModule, RedisService],
})
export class CommonModule {}
