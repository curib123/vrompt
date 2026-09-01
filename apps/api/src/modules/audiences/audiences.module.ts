import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import {
  AdminAudiencesController,
  AudiencesController,
  MyAudiencesController,
} from './audiences.controller';
import { AudiencesService } from './audiences.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AudiencesController,
    MyAudiencesController,
    AdminAudiencesController,
  ],
  providers: [AudiencesService],
  exports: [AudiencesService],
})
export class AudiencesModule {}
