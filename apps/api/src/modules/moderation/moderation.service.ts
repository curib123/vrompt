import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommentStatus,
  ModerationActionType,
  PromptRepositoryStatus,
  ReportStatus,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { ModerationActionDto } from './dto/moderation-action.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prismaService: PrismaService) {}

  async queue(status?: ReportStatus) {
    return this.prismaService.report.findMany({
      where: { status: status ?? ReportStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
        reporter: { select: { username: true } },
      },
    });
  }

  async updateReport(
    actorId: string,
    reportId: string,
    input: ModerationActionDto,
  ) {
    const report = await this.prismaService.report.findUnique({
      where: { id: reportId },
      select: { id: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    const status =
      input.action === 'DISMISS'
        ? ReportStatus.DISMISSED
        : input.action === 'RESOLVE'
          ? ReportStatus.RESOLVED
          : undefined;
    if (!status)
      throw new ForbiddenException('Use dismiss or resolve for reports');
    const updated = await this.prismaService.report.update({
      where: { id: reportId },
      data: { status, resolvedAt: new Date() },
      select: { id: true, status: true },
    });
    await this.audit(
      actorId,
      'REPORT_RESOLVED',
      'REPORT',
      reportId,
      input.reason,
    );
    return updated;
  }

  async repository(
    actorId: string,
    repositoryId: string,
    input: ModerationActionDto,
  ) {
    const action =
      input.action === 'HIDE'
        ? ModerationActionType.HIDE_REPOSITORY
        : ModerationActionType.RESTORE_REPOSITORY;
    const status =
      input.action === 'HIDE'
        ? PromptRepositoryStatus.HIDDEN
        : PromptRepositoryStatus.ACTIVE;
    const updated = await this.prismaService.promptRepository
      .update({
        where: { id: repositoryId },
        data: { status },
        select: { id: true, status: true },
      })
      .catch(() => {
        throw new NotFoundException('Repository not found');
      });
    await this.audit(
      actorId,
      action === ModerationActionType.HIDE_REPOSITORY
        ? 'PROMPT_HIDDEN'
        : 'PROMPT_RESTORED',
      'REPOSITORY',
      repositoryId,
      input.reason,
    );
    return updated;
  }

  async comment(
    actorId: string,
    commentId: string,
    input: ModerationActionDto,
  ) {
    const status =
      input.action === 'HIDE' ? CommentStatus.HIDDEN : CommentStatus.VISIBLE;
    const updated = await this.prismaService.comment
      .update({
        where: { id: commentId },
        data: { status },
        select: { id: true, status: true },
      })
      .catch(() => {
        throw new NotFoundException('Comment not found');
      });
    await this.audit(
      actorId,
      'COMMENT_HIDDEN',
      'COMMENT',
      commentId,
      input.reason,
    );
    return updated;
  }

  async user(actorId: string, userId: string, input: ModerationActionDto) {
    const status =
      input.action === 'SUSPEND' ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    const updated = await this.prismaService.user
      .update({
        where: { id: userId },
        data: { status },
        select: { id: true, status: true },
      })
      .catch(() => {
        throw new NotFoundException('User not found');
      });
    await this.audit(
      actorId,
      input.action === 'SUSPEND' ? 'USER_SUSPENDED' : 'USER_RESTORED',
      'USER',
      userId,
      input.reason,
    );
    return updated;
  }

  async evidence(
    actorId: string,
    evidenceId: string,
    input: ModerationActionDto,
  ) {
    const updated = await this.prismaService.promptEvidenceImage
      .update({
        where: { id: evidenceId },
        data: { isHidden: input.action === 'HIDE' },
        select: { id: true, isHidden: true },
      })
      .catch(() => {
        throw new NotFoundException('Evidence image not found');
      });
    await this.audit(
      actorId,
      input.action === 'HIDE' ? 'PROMPT_HIDDEN' : 'PROMPT_RESTORED',
      'REPOSITORY',
      evidenceId,
      input.reason,
    );
    return updated;
  }

  private audit(
    actorId: string,
    action:
      | 'PROMPT_HIDDEN'
      | 'PROMPT_RESTORED'
      | 'COMMENT_HIDDEN'
      | 'USER_SUSPENDED'
      | 'USER_RESTORED'
      | 'REPORT_RESOLVED',
    targetType: 'REPOSITORY' | 'COMMENT' | 'USER' | 'REPORT',
    targetId: string,
    reason?: string,
  ) {
    return this.prismaService.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata: reason ? { reason } : undefined,
      },
    });
  }
}
