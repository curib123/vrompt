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
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { ModerationActionDto } from './dto/moderation-action.dto';

@Injectable()
export class ModerationService {
  constructor(private readonly prismaService: PrismaService) {}

  async summary() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      openReports,
      reportsToday,
      actionsToday,
      hiddenPrompts,
      hiddenComments,
    ] = await Promise.all([
      this.prismaService.report.count({ where: { status: ReportStatus.OPEN } }),
      this.prismaService.report.count({ where: { createdAt: { gte: since } } }),
      this.prismaService.moderationAction.count({
        where: { createdAt: { gte: since } },
      }),
      this.prismaService.promptRepository.count({
        where: { status: PromptRepositoryStatus.HIDDEN },
      }),
      this.prismaService.comment.count({
        where: { status: CommentStatus.HIDDEN },
      }),
    ]);
    return {
      openReports,
      reportsToday,
      actionsToday,
      hiddenPrompts,
      hiddenComments,
    };
  }

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
    await this.assertReason(input.reason);
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
    return this.prismaService.$transaction(async (tx) => {
      const updated = await tx.report.update({
        where: { id: reportId },
        data: { status, resolvedAt: new Date() },
        select: { id: true, status: true },
      });
      await this.audit(
        tx,
        actorId,
        'REPORT_RESOLVED',
        'REPORT',
        reportId,
        input.reason,
      );
      return updated;
    });
  }

  async repository(
    actorId: string,
    repositoryId: string,
    input: ModerationActionDto,
  ) {
    await this.assertReason(input.reason);
    const action =
      input.action === 'HIDE'
        ? ModerationActionType.HIDE_REPOSITORY
        : ModerationActionType.RESTORE_REPOSITORY;
    const status =
      input.action === 'HIDE'
        ? PromptRepositoryStatus.HIDDEN
        : PromptRepositoryStatus.ACTIVE;
    if (typeof this.prismaService.$transaction !== 'function') {
      const updated = await this.prismaService.promptRepository.update({
        where: { id: repositoryId },
        data: { status },
        select: { id: true, status: true },
      });
      await this.audit(
        this.prismaService,
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
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.promptRepository.update({
          where: { id: repositoryId },
          data: { status },
          select: { id: true, status: true },
        });
        await tx.moderationAction.create({
          data: {
            actorId,
            targetType: 'REPOSITORY',
            targetId: repositoryId,
            action,
            reason: input.reason,
          },
        });
        await this.audit(
          tx,
          actorId,
          action === ModerationActionType.HIDE_REPOSITORY
            ? 'PROMPT_HIDDEN'
            : 'PROMPT_RESTORED',
          'REPOSITORY',
          repositoryId,
          input.reason,
        );
        return updated;
      });
    } catch {
      throw new NotFoundException('Repository not found');
    }
  }

  async comment(
    actorId: string,
    commentId: string,
    input: ModerationActionDto,
  ) {
    await this.assertReason(input.reason);
    const status =
      input.action === 'HIDE' ? CommentStatus.HIDDEN : CommentStatus.VISIBLE;
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.comment.update({
          where: { id: commentId },
          data: { status },
          select: { id: true, status: true },
        });
        const moderationAction =
          input.action === 'HIDE'
            ? ModerationActionType.HIDE_COMMENT
            : ModerationActionType.RESTORE_COMMENT;
        await tx.moderationAction.create({
          data: {
            actorId,
            targetType: 'COMMENT',
            targetId: commentId,
            action: moderationAction,
            reason: input.reason,
          },
        });
        await this.audit(
          tx,
          actorId,
          input.action === 'HIDE' ? 'COMMENT_HIDDEN' : 'COMMENT_HIDDEN',
          'COMMENT',
          commentId,
          input.reason,
        );
        return updated;
      });
    } catch {
      throw new NotFoundException('Comment not found');
    }
  }

  async user(actorId: string, userId: string, input: ModerationActionDto) {
    await this.assertReason(input.reason);
    const status =
      input.action === 'SUSPEND' ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: userId },
          data: { status },
          select: { id: true, status: true },
        });
        const moderationAction =
          input.action === 'SUSPEND'
            ? ModerationActionType.SUSPEND_USER
            : ModerationActionType.RESTORE_USER;
        await tx.moderationAction.create({
          data: {
            actorId,
            targetType: 'USER',
            targetId: userId,
            action: moderationAction,
            reason: input.reason,
          },
        });
        await this.audit(
          tx,
          actorId,
          input.action === 'SUSPEND' ? 'USER_SUSPENDED' : 'USER_RESTORED',
          'USER',
          userId,
          input.reason,
        );
        return updated;
      });
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async evidence(
    actorId: string,
    evidenceId: string,
    input: ModerationActionDto,
  ) {
    await this.assertReason(input.reason);
    if (typeof this.prismaService.$transaction !== 'function') {
      const updated = await this.prismaService.promptEvidenceImage.update({
        where: { id: evidenceId },
        data: { isHidden: input.action === 'HIDE' },
        select: { id: true, isHidden: true },
      });
      await this.audit(
        this.prismaService,
        actorId,
        input.action === 'HIDE' ? 'PROMPT_HIDDEN' : 'PROMPT_RESTORED',
        'REPOSITORY',
        evidenceId,
        input.reason,
      );
      return updated;
    }
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const updated = await tx.promptEvidenceImage.update({
          where: { id: evidenceId },
          data: { isHidden: input.action === 'HIDE' },
          select: { id: true, isHidden: true },
        });
        const action =
          input.action === 'HIDE'
            ? ModerationActionType.HIDE_REPOSITORY
            : ModerationActionType.RESTORE_REPOSITORY;
        await tx.moderationAction.create({
          data: {
            actorId,
            targetType: 'REPOSITORY',
            targetId: evidenceId,
            action,
            reason: input.reason,
            metadata: { evidenceId: true },
          },
        });
        await this.audit(
          tx,
          actorId,
          input.action === 'HIDE' ? 'PROMPT_HIDDEN' : 'PROMPT_RESTORED',
          'REPOSITORY',
          evidenceId,
          input.reason,
        );
        return updated;
      });
    } catch {
      throw new NotFoundException('Evidence image not found');
    }
  }

  private audit(
    client: Prisma.TransactionClient | PrismaService,
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
    return client.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        metadata: reason ? { reason } : undefined,
      },
    });
  }

  private async assertReason(reason?: string) {
    const setting = await this.prismaService.siteSetting.findUnique({
      where: { key: 'moderation.requireReasons' },
      select: { value: true },
    });
    if (setting?.value !== false && !reason?.trim()) {
      throw new ForbiddenException('A moderation reason is required');
    }
  }
}
