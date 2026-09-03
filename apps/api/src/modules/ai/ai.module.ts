import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiAdminController } from './ai-admin.controller';
import { AiGenerationService } from './ai-generation.service';
import { AiProviderService } from './ai-provider.service';
import { AiQualityService } from './ai-quality.service';
import { AiQuotaService } from './ai-quota.service';
import { AiEntitlementsService } from './ai-entitlements.service';
import { AuthModule } from '../auth/auth.module';
import { PromptsModule } from '../prompts/prompts.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuthModule, PromptsModule, SettingsModule],
  controllers: [AiController, AiAdminController],
  providers: [
    AiGenerationService,
    AiProviderService,
    AiQualityService,
    AiQuotaService,
    AiEntitlementsService,
  ],
  exports: [AiGenerationService],
})
export class AiModule {}
