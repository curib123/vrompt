import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  it('clamps pagination and searches the public repository index', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      promptRepository: { findMany, count },
    };

    await expect(
      new SearchService(prisma as unknown as PrismaService).search({
        q: '  writing  ',
        page: 0,
        pageSize: 100,
        sort: 'newest',
      }),
    ).resolves.toMatchObject({ page: 1, pageSize: 30, total: 0 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 30,
        where: expect.objectContaining({
          status: 'ACTIVE',
          visibility: { in: ['PUBLIC', 'UNLISTED'] },
          OR: expect.any(Array),
        }),
      }),
    );
    expect(count).toHaveBeenCalled();
  });

  it('builds the sitemap index from public content only', async () => {
    const promptFindMany = jest.fn().mockResolvedValue([]);
    const userFindMany = jest.fn().mockResolvedValue([]);
    const collectionFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      promptRepository: { findMany: promptFindMany },
      user: { findMany: userFindMany },
      collection: { findMany: collectionFindMany },
    };

    await expect(
      new SearchService(prisma as unknown as PrismaService).sitemap(),
    ).resolves.toEqual({ prompts: [], profiles: [], collections: [] });
    expect(promptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE', visibility: 'PUBLIC' },
      }),
    );
    expect(collectionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { visibility: 'PUBLIC', archivedAt: null },
      }),
    );
  });

  it('boosts matching audiences without hiding unmatched prompts', async () => {
    const promptFindMany = jest.fn().mockResolvedValue([
      {
        id: 'general-id',
        title: 'General prompt',
        promptAudiences: [],
      },
      {
        id: 'matching-id',
        title: 'Matching prompt',
        promptAudiences: [{ audience: { id: 'audience-id' } }],
      },
    ]);
    const prisma = {
      userAudience: {
        findMany: jest.fn().mockResolvedValue([{ audienceId: 'audience-id' }]),
      },
      promptRepository: {
        findMany: promptFindMany,
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const result = await new SearchService(
      prisma as unknown as PrismaService,
    ).search({ page: 1, pageSize: 12 }, 'user-id');

    expect(result.items.map((item) => item.id)).toEqual([
      'matching-id',
      'general-id',
    ]);
    expect(promptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 }),
    );
  });

  it('uses an explicit audience filter instead of personalization ranking', async () => {
    const promptFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      userAudience: {
        findMany: jest.fn().mockResolvedValue([{ audienceId: 'interest-id' }]),
      },
      promptRepository: {
        findMany: promptFindMany,
        count: jest.fn().mockResolvedValue(0),
      },
    };

    await new SearchService(prisma as unknown as PrismaService).search(
      { audience: 'developers', page: 1, pageSize: 12 },
      'user-id',
    );

    expect(promptFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 12 }),
    );
    expect(promptFindMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        promptAudiences: {
          some: {
            audience: { isActive: true, slug: 'developers' },
          },
        },
      }),
    );
  });
});
