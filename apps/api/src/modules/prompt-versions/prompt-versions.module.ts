import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PromptEvidenceImageService } from './evidence-images/prompt-evidence-image.service';
import { PromptVersionsController } from './prompt-versions.controller';

@Module({
  imports: [AuthModule],
  controllers: [PromptVersionsController],
  providers: [PromptEvidenceImageService],
  exports: [PromptEvidenceImageService],
})
export class PromptVersionsModule {}
