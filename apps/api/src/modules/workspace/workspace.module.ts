import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { GuestController } from './guest.controller';
import { EconomicsService } from './economics.service';
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
  controllers: [
    WorkspaceController,
    WorkspaceAdminController,
    ProjectsController,
    WorkflowsController,
    GuestController,
  ],
  providers: [
    ProjectsService,
    WorkflowsService,
    EconomicsService,
    AttachmentService,
    ChatService,
    ProviderRegistry,
    QuotaService,
    ModelRegistryService,
  ],
})
export class WorkspaceModule {}
