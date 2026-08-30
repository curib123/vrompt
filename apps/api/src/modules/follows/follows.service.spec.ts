import { ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  it('prevents self-following before creating a relation', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'same-user' }),
      },
    };

    await expect(
      new FollowsService(
        prisma as unknown as PrismaService,
        { create: jest.fn() } as unknown as NotificationsService,
      ).follow('same-user', 'same-user'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates a follow and sends one notification', async () => {
    const notify = jest.fn();
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'target-id' }) },
      follow: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
    };

    await expect(
      new FollowsService(
        prisma as unknown as PrismaService,
        { create: notify } as unknown as NotificationsService,
      ).follow('actor-id', 'Target'),
    ).resolves.toEqual({ following: true, followerCount: 1 });
    expect(notify).toHaveBeenCalledWith({
      recipientId: 'target-id',
      actorId: 'actor-id',
      type: 'NEW_FOLLOWER',
    });
  });
});
