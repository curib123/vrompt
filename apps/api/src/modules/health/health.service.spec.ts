import { Test } from '@nestjs/testing';

import { RedisService } from '../common/redis.service';
import { PrismaService } from '../prisma/prisma.service';

import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok when dependencies respond', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
        {
          provide: RedisService,
          useValue: { ping: jest.fn().mockResolvedValue('PONG') },
        },
      ],
    }).compile();

    const service = moduleRef.get(HealthService);

    await expect(service.getHealth()).resolves.toMatchObject({
      status: 'ok',
      service: 'api',
      version: 'v1',
      dependencies: {
        postgres: 'up',
        redis: 'up',
      },
    });
  });
});
