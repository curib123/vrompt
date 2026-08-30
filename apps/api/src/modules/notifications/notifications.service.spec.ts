import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('does not create a notification for the actor themselves', async () => {
    const create = jest.fn();
    const service = new NotificationsService({
      notification: { create },
    } as unknown as PrismaService);

    await expect(
      service.create({
        actorId: 'user-id',
        recipientId: 'user-id',
        type: 'PROMPT_LIKED',
      }),
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("does not let a user mark another user's notification read", async () => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new NotificationsService(
      prisma as unknown as PrismaService,
    );

    await expect(
      service.markRead('owner-id', 'other-notification'),
    ).rejects.toThrow(NotFoundException);
  });
});
