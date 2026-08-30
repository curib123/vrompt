import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommentStatus,
  PromptRepositoryStatus,
  PromptVisibility,
  ReportTargetType,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(reporterId: string, input: CreateReportDto) {
    await this.assertTargetIsReportable(reporterId, input);
    const recent = await this.prismaService.report.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recent) {
      throw new ConflictException('You already reported this target recently');
    }

    const report = await this.prismaService.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: this.cleanNullable(input.description),
      },
      select: { id: true, status: true, createdAt: true },
    });
    return { submitted: true, report };
  }

  private async assertTargetIsReportable(
    reporterId: string,
    input: CreateReportDto,
  ) {
    if (input.targetType === ReportTargetType.REPOSITORY) {
      const repository = await this.prismaService.promptRepository.findFirst({
        where: {
          id: input.targetId,
          status: PromptRepositoryStatus.ACTIVE,
          OR: [
            { visibility: { not: PromptVisibility.PRIVATE } },
            { ownerId: reporterId },
          ],
        },
        select: { id: true },
      });
      if (!repository) throw new NotFoundException('Repository not found');
      return;
    }

    if (input.targetType === ReportTargetType.COMMENT) {
      const comment = await this.prismaService.comment.findFirst({
        where: {
          id: input.targetId,
          status: CommentStatus.VISIBLE,
          promptRepository: {
            status: PromptRepositoryStatus.ACTIVE,
            OR: [
              { visibility: { not: PromptVisibility.PRIVATE } },
              { ownerId: reporterId },
            ],
          },
        },
        select: { id: true },
      });
      if (!comment) throw new NotFoundException('Comment not found');
      return;
    }

    const user = await this.prismaService.user.findFirst({
      where: { id: input.targetId, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found');
  }

  private cleanNullable(value: string | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
