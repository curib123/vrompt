import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from '../tags/tags.service';
import { PromptsService } from './prompts.service';

describe('PromptsService', () => {
  it('creates a repository with Version 1 and normalized tag associations', async () => {
    const transaction = {
      promptRepository: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'repository-id',
          slug: 'my-prompt',
          versions: [{ id: 'version-id' }],
        }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      promptTag: { createMany: jest.fn().mockResolvedValue(undefined) },
    };
    const prismaService = {
      category: {
        findUnique: jest.fn().mockResolvedValue({ id: 'category-id' }),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const tagsService = {
      createOrGet: jest.fn((input: { name: string }) =>
        Promise.resolve({ id: `${input.name}-id` }),
      ),
    };
    const service = await createService(prismaService, tagsService);

    await expect(
      service.create('owner-id', {
        categorySlug: 'coding',
        content: 'Write a concise answer.',
        tags: ['AI', ' ai ', 'Writing'],
        title: 'My Prompt',
      }),
    ).resolves.toEqual({
      id: 'repository-id',
      promptVersionId: 'version-id',
      slug: 'my-prompt',
    });

    expect(transaction.promptRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'owner-id',
          slug: 'my-prompt',
          versions: expect.any(Object),
        }),
      }),
    );
    expect(transaction.promptTag.createMany).toHaveBeenCalledWith({
      data: [
        { promptRepositoryId: 'repository-id', tagId: 'ai-id' },
        { promptRepositoryId: 'repository-id', tagId: 'writing-id' },
      ],
      skipDuplicates: true,
    });
  });
});

async function createService(prismaService: object, tagsService: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      PromptsService,
      { provide: PrismaService, useValue: prismaService },
      { provide: TagsService, useValue: tagsService },
    ],
  }).compile();

  return moduleRef.get(PromptsService);
}
