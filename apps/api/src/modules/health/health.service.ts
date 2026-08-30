import { Injectable } from '@nestjs/common';

import { HealthResponseDto } from '../../common/dto/health-response.dto';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private withTimeout<T>(promise: Promise<T>, timeoutMs = 1_000) {
    let timeout: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('Health check timed out')),
        timeoutMs,
      );
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeout);
    });
  }

  async getHealth(): Promise<HealthResponseDto> {
    const [postgres, redis] = await Promise.allSettled([
      this.withTimeout(this.prismaService.$queryRaw`SELECT 1`),
      this.withTimeout(this.redisService.ping()),
    ]);

    const dependencies = {
      postgres: postgres.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    } as const;

    return {
      status:
        dependencies.postgres === 'up' && dependencies.redis === 'up'
          ? 'ok'
          : 'degraded',
      service: 'api',
      version: 'v1',
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }
}
