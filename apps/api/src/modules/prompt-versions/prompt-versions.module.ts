import { Module } from '@nestjs/common';

import { PromptEvidenceImageService } from './evidence-images/prompt-evidence-image.service';

@Module({
  providers: [PromptEvidenceImageService],
  exports: [PromptEvidenceImageService],
})
export class PromptVersionsModule {}
