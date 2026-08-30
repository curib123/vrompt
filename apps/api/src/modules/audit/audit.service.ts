import { Injectable } from '@nestjs/common';
import { AuditActionType, AuditTargetType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AuditQueryDto } from './dto/audit-query.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(input: AuditQueryDto) {
    const page = Math.max(Number(input.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize) || 30, 1), 100);
    const where = {
      ...(input.action ? { action: input.action as AuditActionType } : {}),
      ...(input.targetType
        ? { targetType: input.targetType as AuditTargetType }
        : {}),
      ...(input.actor
        ? { actor: { username: input.actor.trim().toLowerCase() } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prismaService.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          createdAt: true,
          actor: { select: { username: true } },
        },
      }),
      this.prismaService.auditLog.count({ where }),
    ]);
    return {
      items,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }
}
