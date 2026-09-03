import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiGenerationService } from './ai-generation.service';
import { AiProviderService } from './ai-provider.service';
import { AiQualityService } from './ai-quality.service';
import { AiQuotaService } from './ai-quota.service';

@Module({
  controllers: [AiController],
  providers: [
    AiGenerationService,
    AiProviderService,
    AiQualityService,
    AiQuotaService,
  ],
  exports: [AiGenerationService],
})
export class AiModule {}
