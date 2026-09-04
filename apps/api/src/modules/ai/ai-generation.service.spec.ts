import { BadRequestException } from '@nestjs/common';
import { AiGenerationOperation } from '@prisma/client';

import { AiGenerationService } from './ai-generation.service';

function buildService(plan: 'GUEST' | 'FREE' = 'GUEST') {
  const quota = {
    reserve: jest.fn().mockRejectedValue(new Error('stop after reservation')),
  };
  const entitlements = {
    forUser: jest.fn().mockResolvedValue({
      plan,
      dailyGenerationLimit: plan === 'FREE' ? 10 : 3,
      advancedTools: plan === 'FREE',
      generationEnabled: true,
      concurrencyLimit: 1,
      rateLimitPerMinute: 5,
      maxInputChars: 40,
    }),
  };
  const redis = {
    increment: jest.fn().mockResolvedValue(1),
    decrement: jest.fn().mockResolvedValue(0),
  };
  const config = {
    get: jest.fn((key: string, fallback?: unknown) =>
      key === 'JWT_ACCESS_SECRET' ? 'unit-test-secret' : fallback,
    ),
  };
  const service = new AiGenerationService(
    {} as never,
    config as never,
    {} as never,
    {} as never,
    quota as never,
    {} as never,
    entitlements as never,
    redis as never,
  );
  return { service, quota };
}

describe('AiGenerationService Free-tier protection', () => {
  it('uses a non-reversible server-derived guest quota identity', async () => {
    const { service, quota } = buildService();

    await expect(
      service.generatePublic(
        { goal: 'Create a useful project launch checklist' },
        undefined,
        '203.0.113.10',
      ),
    ).rejects.toThrow('stop after reservation');

    const reservation = quota.reserve.mock.calls[0][0];
    expect(reservation.subjectKey).toMatch(/^guest:[a-f0-9]{64}$/);
    expect(reservation.subjectKey).not.toContain('203.0.113.10');
  });

  it('rejects oversized combined refinement input before using quota', async () => {
    const { service, quota } = buildService();

    await expect(
      service.generatePublic(
        {
          goal: 'Improve this prompt',
          basePrompt: 'x'.repeat(40),
        },
        undefined,
        '203.0.113.10',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quota.reserve).not.toHaveBeenCalled();
  });

  it('allows Free members to use refinement tools within their daily allowance', async () => {
    const { service, quota } = buildService('FREE');

    await expect(
      service.generatePublic(
        {
          goal: 'Improve this prompt',
          operation: AiGenerationOperation.IMPROVE,
          basePrompt: 'Useful launch prompt.',
        },
        { id: 'free-user' } as never,
        '203.0.113.10',
      ),
    ).rejects.toThrow('stop after reservation');
    expect(quota.reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        operation: AiGenerationOperation.IMPROVE,
      }),
    );
  });
});
