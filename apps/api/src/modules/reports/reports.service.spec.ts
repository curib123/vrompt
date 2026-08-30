import { ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const repository = {
    promptRepository: {
      findFirst: jest.fn().mockResolvedValue({ id: 'repo-id' }),
    },
    report: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'report-id',
        status: 'OPEN',
        createdAt: new Date(),
      }),
    },
  };

  it('creates a report with trimmed optional context', async () => {
    const service = new ReportsService(repository as unknown as PrismaService);

    await expect(
      service.create('reporter-id', {
        targetType: 'REPOSITORY',
        targetId: 'repo-id',
        reason: 'MISLEADING_EVIDENCE',
        description: '  Evidence does not match the prompt.  ',
      }),
    ).resolves.toEqual(expect.objectContaining({ submitted: true }));
    expect(repository.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: 'Evidence does not match the prompt.',
        }),
      }),
    );
  });

  it('suppresses duplicate reports within the cooldown window', async () => {
    const prisma = {
      promptRepository: repository.promptRepository,
      report: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-report' }),
        create: jest.fn(),
      },
    };
    const service = new ReportsService(prisma as unknown as PrismaService);

    await expect(
      service.create('reporter-id', {
        targetType: 'REPOSITORY',
        targetId: 'repo-id',
        reason: 'SPAM',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('does not report an unavailable repository', async () => {
    const prisma = {
      promptRepository: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ReportsService(prisma as unknown as PrismaService);

    await expect(
      service.create('reporter-id', {
        targetType: 'REPOSITORY',
        targetId: 'missing-id',
        reason: 'OTHER',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
