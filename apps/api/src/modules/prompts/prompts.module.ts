import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AudiencesModule } from '../audiences/audiences.module';
import { TagsModule } from '../tags/tags.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

@Module({
  imports: [AuthModule, AudiencesModule, TagsModule, NotificationsModule],
  controllers: [PromptsController],
  providers: [PromptsService],
  exports: [PromptsService],
})
export class PromptsModule {}
