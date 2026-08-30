import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  PromptRepositoryStatus,
  PromptVisibility,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async list(userId: string, page = 1, pageSize = 20) {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const where = { recipientId: userId };
    const [items, total, unreadCount] = await Promise.all([
      this.prismaService.notification.findMany({
        where,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          readAt: true,
          createdAt: true,
          actor: { select: { username: true } },
          promptRepository: {
            where: {
              status: PromptRepositoryStatus.ACTIVE,
              OR: [
                { visibility: { not: PromptVisibility.PRIVATE } },
                { ownerId: userId },
              ],
            },
            select: { title: true, slug: true },
          },
          comment: {
            where: { status: { not: 'DELETED' } },
            select: { id: true, content: true, promptRepositoryId: true },
          },
        },
      }),
      this.prismaService.notification.count({ where }),
      this.prismaService.notification.count({
        where: { recipientId: userId, readAt: null },
      }),
    ]);

    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
      unreadCount,
      hasNextPage: safePage * safePageSize < total,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prismaService.notification.count({
      where: { recipientId: userId, readAt: null },
    });
    return { unreadCount: count };
  }

  async markRead(userId: string, notificationId: string) {
    const result = await this.prismaService.notification.updateMany({
      where: { id: notificationId, recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const exists = await this.prismaService.notification.findFirst({
        where: { id: notificationId, recipientId: userId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Notification not found');
    }
    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prismaService.notification.updateMany({
      where: { recipientId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: true, updated: result.count };
  }

  create(input: {
    recipientId: string;
    actorId?: string;
    type: NotificationType;
    promptRepositoryId?: string;
    commentId?: string;
  }) {
    if (input.recipientId === input.actorId) return Promise.resolve(null);
    return this.prismaService.notification.create({ data: input });
  }
}
