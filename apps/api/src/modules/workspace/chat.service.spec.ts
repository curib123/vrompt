import { AIModel, GenerationPolicy, Prisma } from '@prisma/client';
import { ChatService } from './chat.service';
import { ProviderFailure, emptyUsage } from './providers';
import { RoutingHealth, estimateContext } from './routing';

describe('Auto orchestration', () => {
  const model = (id: string, cost: number) =>
    ({
      id,
      provider: 'OPENAI',
      providerModelId: id,
      displayName: id,
      manualAvailable: true,
      autoAvailable: true,
      capabilities: ['text'],
      qualityTier: 2,
      maxContext: 32000,
      maxOutput: 1000,
      routingCostScore: new Prisma.Decimal(cost),
      routingPriority: 0,
      inputPrice: new Prisma.Decimal(1),
      outputPrice: new Prisma.Decimal(1),
      cachedInputPrice: new Prisma.Decimal(1),
      additionalPrices: {},
      currency: 'USD',
    }) as AIModel;

  function setup() {
    const models = [model('first', 1), model('second', 2), model('premium', 3)];
    const policy = {
      bucket: 'AUTO',
      allowedFeatures: ['chat'],
      maxInputChars: 12000,
      maxContext: 32000,
      maxOutput: 1000,
      maxFiles: 2,
      maxFileBytes: 5000000,
      maxDurationSeconds: 1,
      routing: {
        allowedModelIds: ['first', 'second'],
        maxAttempts: 2,
        attemptTimeoutSeconds: 1,
      },
    } as unknown as GenerationPolicy;
    const quota = {
      policies: jest.fn().mockResolvedValue({ policies: [policy] }),
      reserve: jest.fn(),
      finalizeIn: jest.fn(),
      usage: jest.fn(),
    };
    const prisma: any = {
      conversation: {
        findFirst: jest.fn().mockResolvedValue({ id: 'conversation' }),
        updateMany: jest.fn(),
      },
      message: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'assistant' }),
        updateMany: jest.fn(),
      },
      usageRecord: { createMany: jest.fn() },
      $queryRaw: jest.fn(),
    };
    prisma.$transaction = (fn: any) => fn(prisma);
    const stream = jest.fn(async (...args: any[]) => {
      args[5]('answer');
    });
    const registry = {
      available: jest.fn().mockResolvedValue(models),
      health: new RoutingHealth(),
    };
    const service = new ChatService(
      prisma,
      quota as any,
      registry as any,
      { get: () => ({ stream }) } as any,
      { forConversation: async () => [] } as any,
    );
    const events: any[] = [];
    const controller = new AbortController();
    const run = (mode: 'AUTO' | 'MANUAL' = 'AUTO') =>
      service.generate(
        'user',
        'conversation',
        { requestId: 'request', content: 'hello', mode, modelId: 'first' },
        controller.signal,
        (e) => events.push(e),
      );
    return {
      models,
      policy,
      quota,
      prisma,
      stream,
      registry,
      events,
      controller,
      run,
    };
  }

  it('falls back once after a retryable error and finalizes a single reservation', async () => {
    const s = setup();
    s.stream.mockImplementationOnce(async () => {
      throw new ProviderFailure('HTTP_503');
    });
    await s.run();
    expect(s.stream.mock.calls.map((c) => c[0].id)).toEqual([
      'first',
      'second',
    ]);
    expect(s.quota.reserve).toHaveBeenCalledTimes(1);
    expect(s.quota.finalizeIn).toHaveBeenCalledWith(
      s.prisma,
      'request',
      'SUCCEEDED',
      true,
    );
    expect(s.prisma.usageRecord.createMany.mock.calls[0][0].data).toHaveLength(
      2,
    );
  });

  it('times out a stalled first attempt while the overall deadline still allows fallback', async () => {
    const s = setup();
    s.stream.mockImplementationOnce(
      (...args: any[]) =>
        new Promise<void>((_resolve, reject) => {
          args[4].addEventListener(
            'abort',
            () => reject(new Error('aborted')),
            { once: true },
          );
        }),
    );
    await s.run();
    expect(s.stream).toHaveBeenCalledTimes(2);
    expect(s.events.at(-1).status).toBe('SUCCEEDED');
    expect(
      s.prisma.usageRecord.createMany.mock.calls[0][0].data[0].errorCategory,
    ).toBe('ATTEMPT_TIMEOUT');
  });

  it.each(['partial', 'usage', 'cancel', 'permanent'])(
    'does not retry after %s',
    async (reason) => {
      const s = setup();
      s.stream.mockImplementationOnce(async (...args: any[]) => {
        if (reason === 'partial') args[5]('partial answer');
        if (reason === 'usage')
          Object.assign(args[6], {
            ...emptyUsage(),
            input: 10,
            reported: true,
          });
        if (reason === 'cancel') s.controller.abort();
        throw new ProviderFailure('HTTP_503', reason !== 'permanent');
      });
      await s.run();
      expect(s.stream).toHaveBeenCalledTimes(1);
      expect(s.quota.finalizeIn).toHaveBeenCalledTimes(1);
    },
  );

  it('does not switch a manually selected model', async () => {
    const s = setup();
    Object.assign(s.policy, { bucket: 'first', modelId: 'first' });
    s.stream.mockRejectedValue(new ProviderFailure('HTTP_503'));
    await s.run('MANUAL');
    expect(s.stream).toHaveBeenCalledTimes(1);
  });

  it('fails closed for missing pools, without charging', async () => {
    const s = setup();
    s.policy.routing = {};
    await expect(s.run()).rejects.toThrow('No suitable Auto model');
    expect(s.quota.reserve).not.toHaveBeenCalled();
  });

  it('does not use a configured fallback outside the plan pool', async () => {
    const s = setup();
    s.models[0]!.fallbackId = 'premium';
    s.stream.mockRejectedValue(new ProviderFailure('HTTP_503'));
    await s.run();
    expect(s.stream.mock.calls.map((c) => c[0].id)).toEqual([
      'first',
      'second',
    ]);
  });

  it('skips cooling models and refuses requests when all eligible models are cooling', async () => {
    const s = setup();
    s.registry.health.failure('first', 'HTTP_429');
    await s.run();
    expect(s.stream.mock.calls[0]![0].id).toBe('second');
    s.registry.health.failure('second', 'HTTP_429');
    await expect(s.run()).rejects.toThrow('No suitable Auto model');
  });

  it('does not contact a provider when quota reservation fails', async () => {
    const s = setup();
    s.quota.reserve.mockRejectedValue(new Error('quota exhausted'));
    await expect(s.run()).rejects.toThrow('quota exhausted');
    expect(s.stream).not.toHaveBeenCalled();
  });
});

describe('Routing estimates and cooldown', () => {
  it('does not count compressed image bytes as text tokens', () => {
    const image = {
      name: 'photo.png',
      mimeType: 'image/png',
      data: Buffer.alloc(100000),
    };
    expect(
      estimateContext([{ role: 'user', content: 'Describe this' }], [image]),
    ).toBeLessThan(5000);
  });
  it('uses language-aware text estimates instead of raw attachment bytes', () => {
    expect(
      estimateContext(
        [],
        [
          {
            name: 'notes.txt',
            mimeType: 'text/plain',
            data: Buffer.from('hello '.repeat(1000)),
          },
        ],
      ),
    ).toBeLessThan(2100);
  });
  it('recovers after cooldown and ignores user/request errors', () => {
    const health = new RoutingHealth();
    health.failure('m', 'HTTP_400', 0);
    expect(health.available('m', 0)).toBe(true);
    health.failure('m', 'HTTP_503', 0);
    expect(health.available('m', 0)).toBe(true);
    health.failure('m', 'HTTP_503', 1);
    expect(health.available('m', 2)).toBe(false);
    expect(health.available('m', 30001)).toBe(true);
    health.success('m');
    expect(health.available('m', 2)).toBe(true);
  });
});
