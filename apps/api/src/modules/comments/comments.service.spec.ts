import { ForbiddenException } from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  it('sanitizes comment content and notifies the repository owner', async () => {
    const notify = jest.fn();
    const prisma = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-id',
          ownerId: 'owner-id',
          status: 'ACTIVE',
          visibility: 'PUBLIC',
        }),
      },
      comment: {
        create: jest.fn().mockResolvedValue({
          id: 'comment-id',
          content: 'hello world',
        }),
      },
    };
    const service = new CommentsService(
      prisma as unknown as PrismaService,
      { increment: jest.fn().mockResolvedValue(1) } as unknown as RedisService,
      { create: notify } as unknown as NotificationsService,
    );

    await expect(
      service.create('prompt', 'reader-id', {
        content: ' <b>hello</b>   world ',
      }),
    ).resolves.toEqual({ id: 'comment-id', content: 'hello world' });
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ content: 'hello world' }),
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROMPT_COMMENTED',
        commentId: 'comment-id',
      }),
    );
  });

  it('rejects empty sanitized content', async () => {
    const prisma = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-id',
          ownerId: 'owner-id',
          status: 'ACTIVE',
          visibility: 'PUBLIC',
        }),
      },
    };
    const service = new CommentsService(
      prisma as unknown as PrismaService,
      { increment: jest.fn().mockResolvedValue(1) } as unknown as RedisService,
      { create: jest.fn() } as unknown as NotificationsService,
    );

    await expect(
      service.create('prompt', 'reader-id', { content: '<b> </b>' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
