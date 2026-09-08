import { PrismaService } from '../prisma/prisma.service';
import { periods, QuotaService } from './quota.service';

describe('usage balances', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-08T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  function setup(counters: unknown[] = []) {
    const prisma = {
      usageCounter: { findMany: jest.fn().mockResolvedValue(counters) },
    };
    const quota = new QuotaService(prisma as unknown as PrismaService);
    jest.spyOn(quota, 'policies').mockResolvedValue({
      plan: { name: 'Pro', monthlyCredits: 100 },
      subscription: null,
      policies: [
        {
          bucket: 'configured-model',
          model: { displayName: 'Model under maintenance', provider: 'OPENAI' },
          allowedFeatures: ['chat'],
          dailyLimit: 20,
          monthlyLimit: 100,
          maxFiles: 1,
          maxFileBytes: 500_000,
        },
      ],
    } as unknown as Awaited<ReturnType<QuotaService['policies']>>);
    return quota;
  }

  it('includes bonus credits in the total and subtracts used and reserved credits from the correct monthly counter', async () => {
    const p = periods();
    const quota = setup([
      {
        bucket: 'CREDITS',
        period: 'DAILY',
        periodStart: p.day,
        extra: 0,
        used: 999,
        reserved: 0,
      },
      {
        bucket: 'CREDITS',
        period: 'MONTHLY',
        periodStart: p.month,
        extra: 50,
        used: 20,
        reserved: 5,
      },
      {
        bucket: 'configured-model',
        period: 'DAILY',
        periodStart: p.day,
        extra: 5,
        used: 5,
        reserved: 2,
      },
      {
        bucket: 'configured-model',
        period: 'MONTHLY',
        periodStart: p.month,
        extra: 10,
        used: 8,
        reserved: 2,
      },
    ]);
    const usage = await quota.usage('user');
    expect(usage.credits).toEqual({
      limit: 150,
      remaining: 125,
      used: 20,
      reserved: 5,
    });
    expect(usage.allowances[0]).toMatchObject({
      dailyLimit: 25,
      dailyRemaining: 18,
      monthlyLimit: 110,
      monthlyRemaining: 100,
    });
  });

  it('retains model identity without depending on the list of available models', async () => {
    const usage = await setup().usage('user');
    expect(usage.allowances[0]).toMatchObject({
      modelName: 'Model under maintenance',
      provider: 'OPENAI',
    });
    expect(usage.resets.daily.toISOString()).toBe('2026-09-09T00:00:00.000Z');
    expect(usage.resets.monthly.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('shows zero remaining after a plan limit is reduced below prior usage', async () => {
    const usage = await setup([
      {
        bucket: 'CREDITS',
        period: 'MONTHLY',
        periodStart: periods().month,
        extra: 0,
        used: 120,
        reserved: 5,
      },
    ]).usage('user');
    expect(usage.credits).toEqual({
      limit: 100,
      remaining: 0,
      used: 120,
      reserved: 5,
    });
  });
});
