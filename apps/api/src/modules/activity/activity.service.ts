import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CollectionVisibility,
  PromptRepositoryStatus,
  PromptVisibility,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slug';

@Injectable()
export class ActivityService {
  constructor(private readonly prismaService: PrismaService) {}

  async feed(userId: string, page = 1, pageSize = 20) {
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const follows = await this.prismaService.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = follows.map((follow) => follow.followingId);
    if (followingIds.length === 0) {
      return {
        items: [],
        page: safePage,
        pageSize: safePageSize,
        total: 0,
        hasNextPage: false,
      };
    }

    const where = {
      actorId: { in: followingIds },
      OR: [
        {
          promptRepository: {
            status: PromptRepositoryStatus.ACTIVE,
            visibility: {
              in: [PromptVisibility.PUBLIC, PromptVisibility.UNLISTED],
            },
          },
        },
        {
          collection: {
            visibility: CollectionVisibility.PUBLIC,
            archivedAt: null,
          },
        },
      ],
    };
    const [items, total] = await Promise.all([
      this.prismaService.activityEvent.findMany({
        where,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          metadata: true,
          createdAt: true,
          actor: { select: { username: true } },
          promptRepository: { select: { title: true, slug: true } },
          collection: {
            select: {
              name: true,
              slug: true,
              owner: { select: { username: true } },
            },
          },
        },
      }),
      this.prismaService.activityEvent.count({ where }),
    ]);

    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
      hasNextPage: page * safePageSize < total,
    };
  }

  async repositoryHistory(slug: string, viewerId?: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug: slugify(slug) },
      select: { id: true, ownerId: true, status: true, visibility: true },
    });
    if (
      !repository ||
      repository.status !== PromptRepositoryStatus.ACTIVE ||
      (repository.visibility === PromptVisibility.PRIVATE &&
        repository.ownerId !== viewerId)
    ) {
      throw new NotFoundException('Repository not found');
    }

    return this.prismaService.activityEvent.findMany({
      where: { promptRepositoryId: repository.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        metadata: true,
        createdAt: true,
        actor: { select: { username: true } },
      },
    });
  }
}
