import { Global, Module } from '@nestjs/common';

import { MediaStorageModule } from './media-storage/media-storage.module';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [MediaStorageModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class CommonModule {}
