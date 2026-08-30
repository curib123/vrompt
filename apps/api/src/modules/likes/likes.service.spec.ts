import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LikesService } from './likes.service';

describe('LikesService', () => {
  it('creates a like, increments the count, and notifies the owner', async () => {
    const notify = jest.fn();
    const prisma = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-id',
          ownerId: 'owner-id',
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          likeCount: 4,
        }),
      },
      $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
        callback({
          like: { create: jest.fn() },
          promptRepository: { update: jest.fn() },
        }),
      ),
    };
    const service = new LikesService(
      prisma as unknown as PrismaService,
      { create: notify } as unknown as NotificationsService,
    );

    await expect(service.like('reader-id', 'prompt')).resolves.toEqual({
      liked: true,
      likeCount: 5,
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'PROMPT_LIKED',
        recipientId: 'owner-id',
      }),
    );
  });

  it('removes a like without taking the count below zero', async () => {
    const prisma = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-id',
          ownerId: 'owner-id',
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          likeCount: 0,
        }),
      },
      $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
        callback({
          like: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        }),
      ),
    };

    await expect(
      new LikesService(
        prisma as unknown as PrismaService,
        { create: jest.fn() } as unknown as NotificationsService,
      ).unlike('reader-id', 'prompt'),
    ).resolves.toEqual({ liked: false, likeCount: 0 });
  });
});
