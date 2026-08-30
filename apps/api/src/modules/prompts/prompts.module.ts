import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { TagsModule } from '../tags/tags.module';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

@Module({
  imports: [AuthModule, TagsModule],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
