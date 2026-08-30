import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { BookmarksService } from './bookmarks.service';

describe('BookmarksService', () => {
  it('saves a readable repository and increments its count', async () => {
    const update = jest.fn();
    const prisma = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-id',
          ownerId: 'owner-id',
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          saveCount: 2,
        }),
      },
      $transaction: jest.fn((callback: (transaction: unknown) => unknown) =>
        callback({
          bookmark: { create: jest.fn() },
          promptRepository: { update },
        }),
      ),
    };

    await expect(
      new BookmarksService(prisma as unknown as PrismaService).save(
        'reader-id',
        '  useful-prompts ',
      ),
    ).resolves.toEqual({ saved: true, saveCount: 3 });
    expect(prisma.promptRepository.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'useful-prompts' } }),
    );
    expect(update).toHaveBeenCalled();
  });

  it('hides private repositories from other users', async () => {
    const prisma = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'repo-id',
          ownerId: 'owner-id',
          visibility: 'PRIVATE',
          status: 'ACTIVE',
          saveCount: 0,
        }),
      },
    };

    await expect(
      new BookmarksService(prisma as unknown as PrismaService).save(
        'reader-id',
        'private-prompt',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
