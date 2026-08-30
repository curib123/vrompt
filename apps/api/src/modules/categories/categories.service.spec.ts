import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  it('lists categories in display order', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = await createService({ category: { findMany } });

    await service.list();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
  });

  it('normalizes category names and creates a stable slug', async () => {
    const create = jest.fn().mockResolvedValue({
      name: 'Data Analysis',
      slug: 'data-analysis',
    });
    const service = await createService({ category: { create } });

    await service.create({ name: '  Data   Analysis  ' });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Data Analysis', slug: 'data-analysis' },
      }),
    );
  });

  it('maps duplicate official categories to a conflict', async () => {
    const create = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.7.0',
      }),
    );
    const service = await createService({ category: { create } });

    await expect(service.create({ name: 'Coding' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects categories without a usable slug', async () => {
    const service = await createService({ category: { create: jest.fn() } });

    await expect(service.create({ name: '***' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

async function createService(prismaService: object) {
  const moduleRef = await Test.createTestingModule({
    providers: [
      CategoriesService,
      { provide: PrismaService, useValue: prismaService },
    ],
  }).compile();

  return moduleRef.get(CategoriesService);
}
