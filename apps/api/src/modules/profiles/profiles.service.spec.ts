import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { MediaStorageService } from '../common/media-storage/media-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  const publicProfile = {
    id: 'user-id',
    username: 'creator',
    accountType: 'REAL',
    createdAt: new Date('2026-08-01'),
    profile: {
      displayName: 'Prompt Creator',
      bio: 'Building useful prompts.',
      avatar: null,
      website: 'https://example.com',
    },
    _count: { ownedRepositories: 2, followers: 4, following: 3 },
    ownedRepositories: [
      {
        id: 'repository-id',
        title: 'Useful prompts',
        slug: 'useful-prompts',
        description: 'A public collection of prompts.',
        updatedAt: new Date('2026-08-02'),
      },
    ],
    collections: [],
  };

  it('returns public profile details and public content counts', async () => {
    const prismaService = {
      user: { findFirst: jest.fn().mockResolvedValue(publicProfile) },
    };
    const service = await createService(prismaService);

    await expect(service.getPublicProfile(' Creator ')).resolves.toMatchObject({
      username: 'creator',
      stats: { repositories: 2, followers: 4, following: 3 },
      repositories: [{ slug: 'useful-prompts' }],
    });

    expect(prismaService.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: 'creator', status: 'ACTIVE' },
      }),
    );
  });

  it('only updates the authenticated user id', async () => {
    const transaction = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-id' }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      profile: { upsert: jest.fn().mockResolvedValue(undefined) },
    };
    const prismaService = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
      user: { findFirst: jest.fn().mockResolvedValue(publicProfile) },
    };
    const service = await createService(prismaService);

    await service.updateOwnProfile('user-id', {
      username: 'new_creator',
      displayName: 'New Creator',
    });

    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { username: 'new_creator' },
    });
    expect(transaction.profile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-id' } }),
    );
  });

  it('rejects unavailable owners instead of modifying another profile', async () => {
    const prismaService = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          user: { findFirst: jest.fn().mockResolvedValue(null) },
          profile: { upsert: jest.fn() },
        }),
      ),
    };
    const service = await createService(prismaService);

    await expect(
      service.updateOwnProfile('other-user-id', { bio: 'Nope' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps a duplicate username to a conflict response', async () => {
    const prismaService = {
      $transaction: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '6.7.0',
        }),
      ),
    };
    const service = await createService(prismaService);

    await expect(
      service.updateOwnProfile('user-id', { username: 'taken_name' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

async function createService(prismaService: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      ProfilesService,
      { provide: PrismaService, useValue: prismaService },
      { provide: MediaStorageService, useValue: {} },
    ],
  }).compile();

  return moduleRef.get(ProfilesService);
}
