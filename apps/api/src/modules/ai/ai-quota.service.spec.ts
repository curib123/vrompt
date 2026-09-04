import { AiGenerationMode, AiGenerationOperation } from '@prisma/client';

import { AiQuotaService } from './ai-quota.service';

describe('AiQuotaService', () => {
  it('rejects a request when the atomic server-side quota claim fails', async () => {
    const transaction = {
      aiUsageEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      aiQuotaBucket: {
        upsert: jest.fn().mockResolvedValue({ id: 'bucket-id' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new AiQuotaService(prisma as never);

    await expect(
      service.reserve({
        subjectKey: 'guest:server-derived-hash',
        requestKey: 'request-key',
        mode: AiGenerationMode.PUBLIC,
        operation: AiGenerationOperation.GENERATE,
        limit: 3,
      }),
    ).rejects.toMatchObject({ status: 429 });
    expect(transaction.aiUsageEvent.create).not.toHaveBeenCalled();
  });

  it('increments the quota and records usage in one transaction', async () => {
    const event = { id: 'event-id' };
    const transaction = {
      aiUsageEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(event),
      },
      aiQuotaBucket: {
        upsert: jest.fn().mockResolvedValue({ id: 'bucket-id' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new AiQuotaService(prisma as never);

    await expect(
      service.reserve({
        subjectKey: 'guest:server-derived-hash',
        requestKey: 'request-key',
        mode: AiGenerationMode.PUBLIC,
        operation: AiGenerationOperation.GENERATE,
        limit: 3,
      }),
    ).resolves.toEqual({ event, reused: false });
    expect(transaction.aiQuotaBucket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ publicUsed: { lt: 3 } }),
        data: { publicUsed: { increment: 1 } },
      }),
    );
  });

  it('does not apply a daily cap when the entitlement is unlimited', async () => {
    const event = { id: 'pro-event-id' };
    const transaction = {
      aiUsageEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(event),
      },
      aiQuotaBucket: {
        upsert: jest.fn().mockResolvedValue({ id: 'bucket-id' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new AiQuotaService(prisma as never);

    await expect(
      service.reserve({
        subjectKey: 'user:pro-user',
        userId: 'pro-user',
        requestKey: 'pro-request-key',
        mode: AiGenerationMode.PUBLIC,
        operation: AiGenerationOperation.IMPROVE,
        limit: null,
      }),
    ).resolves.toEqual({ event, reused: false });
    expect(transaction.aiQuotaBucket.updateMany).toHaveBeenCalledWith({
      where: { id: 'bucket-id' },
      data: { publicUsed: { increment: 1 } },
    });
  });
});
