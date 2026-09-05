import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttachmentService } from './attachment.service';
import { ChatService } from './chat.service';
import { ProviderRegistry } from './providers';
import { QuotaService } from './quota.service';
import { ModelRegistryService } from './registry.service';
import {
  WorkspaceAdminController,
  WorkspaceController,
} from './workspace.controller';
@Module({
  imports: [AuthModule],
  controllers: [WorkspaceController, WorkspaceAdminController],
  providers: [
    AttachmentService,
    ChatService,
    ProviderRegistry,
    QuotaService,
    ModelRegistryService,
  ],
})
export class WorkspaceModule {}
