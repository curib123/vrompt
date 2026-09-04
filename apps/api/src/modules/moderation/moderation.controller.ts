import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportStatus, UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ModerationActionDto } from './dto/moderation-action.dto';
import { ModerationService } from './moderation.service';

@Controller('admin/moderation')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('summary')
  summary() {
    return this.moderationService.summary();
  }

  @Get('reports')
  queue(@Query('status') status?: ReportStatus) {
    return this.moderationService.queue(status);
  }

  @Patch('reports/:reportId')
  updateReport(
    @Param('reportId') reportId: string,
    @Body() input: ModerationActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderationService.updateReport(user.id, reportId, input);
  }

  @Patch('repositories/:repositoryId')
  repository(
    @Param('repositoryId') repositoryId: string,
    @Body() input: ModerationActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderationService.repository(user.id, repositoryId, input);
  }

  @Patch('comments/:commentId')
  comment(
    @Param('commentId') commentId: string,
    @Body() input: ModerationActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderationService.comment(user.id, commentId, input);
  }

  @Patch('users/:userId')
  user(
    @Param('userId') userId: string,
    @Body() input: ModerationActionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.moderationService.user(actor.id, userId, input);
  }

  @Patch('evidence/:evidenceId')
  evidence(
    @Param('evidenceId') evidenceId: string,
    @Body() input: ModerationActionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderationService.evidence(user.id, evidenceId, input);
  }
}
