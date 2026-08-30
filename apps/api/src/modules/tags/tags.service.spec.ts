import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  it('normalizes a new tag before storing it', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({
      id: 'tag-id',
      name: 'ai tools',
      normalizedName: 'ai tools',
      slug: 'ai-tools',
    });
    const service = await createService({ tag: { findUnique, create } });

    await service.createOrGet({ name: '  AI   Tools  ' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'ai tools',
          normalizedName: 'ai tools',
          slug: 'ai-tools',
        },
      }),
    );
  });

  it('reuses an existing normalized tag instead of duplicating it', async () => {
    const existing = { id: 'tag-id', name: 'ai tools', slug: 'ai-tools' };
    const findUnique = jest.fn().mockResolvedValue(existing);
    const create = jest.fn();
    const service = await createService({ tag: { findUnique, create } });

    await expect(service.createOrGet({ name: 'AI  TOOLS' })).resolves.toBe(
      existing,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('normalizes autocomplete queries and caps result size', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = await createService({ tag: { findMany } });

    await service.search('  AI   ', 100);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 30,
        where: { normalizedName: { contains: 'ai', mode: 'insensitive' } },
      }),
    );
  });

  it('rejects punctuation-only tag names', async () => {
    const service = await createService({ tag: { findUnique: jest.fn() } });

    await expect(service.createOrGet({ name: '***' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

async function createService(prismaService: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      TagsService,
      { provide: PrismaService, useValue: prismaService },
    ],
  }).compile();

  return moduleRef.get(TagsService);
}
