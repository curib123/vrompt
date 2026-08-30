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
});
