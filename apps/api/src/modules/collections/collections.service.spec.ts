import { PrismaService } from '../prisma/prisma.service';
import { CollectionsService } from './collections.service';

describe('CollectionsService', () => {
  it('creates a public collection and records its activity', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'collection-id',
      name: 'Useful prompts',
      slug: 'useful-prompts',
      visibility: 'PUBLIC',
    });
    const activity = jest.fn();
    const prisma = {
      collection: { create },
      activityEvent: { create: activity },
    };

    await expect(
      new CollectionsService(prisma as unknown as PrismaService).create(
        'owner-id',
        { name: ' Useful prompts ', visibility: 'PUBLIC' },
      ),
    ).resolves.toEqual(expect.objectContaining({ slug: 'useful-prompts' }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'owner-id',
          name: 'Useful prompts',
          slug: 'useful-prompts',
        }),
      }),
    );
    expect(activity).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'COLLECTION_CREATED' }),
      }),
    );
  });
});
