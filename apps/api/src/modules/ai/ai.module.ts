import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiAdminController } from './ai-admin.controller';
import { AiGenerationService } from './ai-generation.service';
import { AiProviderService } from './ai-provider.service';
import { AiQualityService } from './ai-quality.service';
import { AiQuotaService } from './ai-quota.service';
import { AuthModule } from '../auth/auth.module';
import { PromptsModule } from '../prompts/prompts.module';

@Module({
  imports: [AuthModule, PromptsModule],
  controllers: [AiController, AiAdminController],
  providers: [
    AiGenerationService,
    AiProviderService,
    AiQualityService,
    AiQuotaService,
  ],
  exports: [AiGenerationService],
})
export class AiModule {}
