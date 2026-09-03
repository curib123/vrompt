import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

export type AiEntitlements = {
  plan: 'GUEST' | 'FREE' | 'PREMIUM';
  dailyGenerationLimit: number;
  advancedTools: boolean;
};

@Injectable()
export class AiEntitlementsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async forUser(userId?: string): Promise<AiEntitlements> {
    if (!userId) {
      return {
        plan: 'GUEST',
        dailyGenerationLimit: this.configService.get<number>(
          'AI_PUBLIC_GUEST_DAILY_LIMIT',
          3,
        ),
        advancedTools: false,
      };
    }
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    if (user?.plan === 'PREMIUM') {
      return {
        plan: 'PREMIUM',
        dailyGenerationLimit: this.configService.get<number>(
          'AI_PUBLIC_PREMIUM_DAILY_LIMIT',
          100,
        ),
        advancedTools: true,
      };
    }
    return {
      plan: 'FREE',
      dailyGenerationLimit: this.configService.get<number>(
        'AI_PUBLIC_FREE_DAILY_LIMIT',
        10,
      ),
      advancedTools: false,
    };
  }

  internalDailyLimit() {
    return this.configService.get<number>('AI_INTERNAL_DAILY_LIMIT', 50);
  }
}
