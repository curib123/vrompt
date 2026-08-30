import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
