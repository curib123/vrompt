import { AiEntitlementsService } from './ai-entitlements.service';

function buildService(subscription: object | null) {
  const prisma = {
    billingSubscription: {
      findFirst: jest.fn().mockResolvedValue(subscription),
    },
  };
  const config = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };
  const settings = {
    getBoolean: jest.fn().mockResolvedValue(true),
    getNumber: jest.fn((_key: string, fallback: number) => fallback),
  };
  return {
    service: new AiEntitlementsService(
      prisma as never,
      config as never,
      settings as never,
    ),
    settings,
  };
}

describe('AiEntitlementsService', () => {
  it('gives Free members every AI tool with a daily generation limit', async () => {
    const { service } = buildService(null);

    await expect(service.forUser('free-user')).resolves.toMatchObject({
      plan: 'FREE',
      dailyGenerationLimit: 10,
      advancedTools: true,
    });
  });

  it('gives active Pro members unlimited daily generations', async () => {
    const { service } = buildService({ id: 'subscription-id' });

    await expect(service.forUser('pro-user')).resolves.toMatchObject({
      plan: 'PRO',
      dailyGenerationLimit: null,
      advancedTools: true,
    });
  });
});
