import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommentStatus,
  PromptRepositoryStatus,
  PromptVisibility,
} from '@prisma/client';

import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(
    slug: string,
    viewerId: string | undefined,
    page = 1,
    pageSize = 20,
  ) {
    const repository = await this.findReadableRepository(slug, viewerId);
    const safePage = Math.max(page, 1);
    const safePageSize = Math.min(Math.max(pageSize, 1), 50);
    const where = {
      promptRepositoryId: repository.id,
      parentId: null,
      status: CommentStatus.VISIBLE,
    };
    const [items, total] = await Promise.all([
      this.prismaService.comment.findMany({
        where,
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        select: this.commentSelect,
      }),
      this.prismaService.comment.count({ where }),
    ]);

    return {
      items,
      page: safePage,
      pageSize: safePageSize,
      total,
      hasNextPage: safePage * safePageSize < total,
    };
  }

  async create(slug: string, userId: string, input: CreateCommentDto) {
    const repository = await this.findReadableRepository(slug, userId);
    await this.assertRateLimit(userId);
    const content = this.cleanContent(input.content);

    if (!content) {
      throw new ForbiddenException('Comment content cannot be empty');
    }

    if (input.parentId) {
      const parent = await this.prismaService.comment.findFirst({
        where: {
          id: input.parentId,
          promptRepositoryId: repository.id,
          parentId: null,
          status: CommentStatus.VISIBLE,
        },
        select: { id: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prismaService.comment.create({
      data: {
        content,
        parentId: input.parentId,
        promptRepositoryId: repository.id,
        userId,
      },
      select: this.commentSelect,
    });

    await this.notificationsService.create({
      recipientId: repository.ownerId,
      actorId: userId,
      type: input.parentId ? 'COMMENT_REPLIED' : 'PROMPT_COMMENTED',
      promptRepositoryId: repository.id,
      commentId: comment.id,
    });

    return comment;
  }

  async update(commentId: string, userId: string, input: UpdateCommentDto) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, status: true },
    });

    if (!comment || comment.status === CommentStatus.DELETED) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('Only the comment author can edit it');
    }

    const content = this.cleanContent(input.content);
    if (!content) {
      throw new ForbiddenException('Comment content cannot be empty');
    }

    return this.prismaService.comment.update({
      where: { id: commentId },
      data: { content },
      select: this.commentSelect,
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prismaService.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, status: true },
    });

    if (!comment || comment.status === CommentStatus.DELETED) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId) {
      throw new ForbiddenException('Only the comment author can delete it');
    }

    await this.prismaService.comment.update({
      where: { id: commentId },
      data: {
        content: '[deleted]',
        deletedAt: new Date(),
        status: CommentStatus.DELETED,
      },
    });

    return { deleted: true };
  }

  private async findReadableRepository(slug: string, viewerId?: string) {
    const repository = await this.prismaService.promptRepository.findUnique({
      where: { slug },
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

    return repository;
  }

  private async assertRateLimit(userId: string) {
    try {
      const count = await this.redisService.increment(
        `comment:create:${userId}`,
        60 * 60,
      );
      if (count > 30) {
        throw new TooManyRequestsException(
          'Comment limit reached. Try again later.',
        );
      }
    } catch (error: unknown) {
      if (error instanceof TooManyRequestsException) {
        throw error;
      }
    }
  }

  private cleanContent(value: string) {
    return value
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2000);
  }

  private readonly commentSelect = {
    id: true,
    userId: true,
    content: true,
    parentId: true,
    createdAt: true,
    updatedAt: true,
    user: { select: { username: true } },
    replies: {
      where: { status: CommentStatus.VISIBLE },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        userId: true,
        content: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { username: true } },
      },
    },
  } as const;
}
