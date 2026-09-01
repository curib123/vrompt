import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AudiencesService } from './audiences.service';

describe('AudiencesService', () => {
  it('rejects inactive or unknown prompt audiences', async () => {
    const prisma = {
      audience: {
        findMany: jest.fn().mockResolvedValue([{ id: 'active-id' }]),
      },
    };
    const service = new AudiencesService(prisma as unknown as PrismaService);

    await expect(
      service.validateActiveIds(['active-id', 'inactive-id']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows clearing prompt metadata without creating an audience relationship', async () => {
    const prisma = {
      audience: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AudiencesService(prisma as unknown as PrismaService);

    await expect(service.validateActiveIds([])).resolves.toEqual([]);
    expect(prisma.audience.findMany).not.toHaveBeenCalled();
  });

  it('enforces the five-interest maximum before querying the database', async () => {
    const findMany = jest.fn();
    const service = new AudiencesService({
      audience: { findMany },
    } as unknown as PrismaService);

    await expect(
      service.updateUserAudiences('user-id', ['1', '2', '3', '4', '5', '6']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate interests and prompt audiences', async () => {
    const service = new AudiencesService({
      audience: { findMany: jest.fn() },
    } as unknown as PrismaService);

    await expect(
      service.updateUserAudiences('user-id', ['audience-id', 'audience-id']),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.validateActiveIds(['audience-id', 'audience-id']),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
