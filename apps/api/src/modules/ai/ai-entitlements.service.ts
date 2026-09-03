import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export type AiEntitlements = {
  plan: 'GUEST' | 'FREE' | 'PRO';
  dailyGenerationLimit: number;
  advancedTools: boolean;
  generationEnabled: boolean;
  concurrencyLimit: number;
  rateLimitPerMinute: number;
  maxInputChars: number;
};

@Injectable()
export class AiEntitlementsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {}

  async forUser(userId?: string): Promise<AiEntitlements> {
    const generationEnabled = await this.settingsService.getBoolean(
      'features.aiGenerationEnabled',
      true,
    );
    const concurrencyLimit = await this.settingsService.getNumber(
      'limits.aiConcurrency',
      2,
    );
    const rateLimitPerMinute = await this.settingsService.getNumber(
      'limits.aiRatePerMinute',
      5,
    );
    const maxInputChars = await this.settingsService.getNumber(
      'limits.aiMaxInputChars',
      4000,
    );
    if (!userId) {
      return {
        plan: 'GUEST',
        dailyGenerationLimit: this.configService.get<number>(
          'AI_PUBLIC_GUEST_DAILY_LIMIT',
          3,
        ),
        advancedTools: false,
        generationEnabled,
        concurrencyLimit,
        rateLimitPerMinute,
        maxInputChars,
      };
    }
    const subscription = await this.prismaService.billingSubscription.findFirst(
      {
        where: {
          userId,
          plan: 'PRO',
          status: 'ACTIVE',
          currentPeriodEnd: { gt: new Date() },
        },
        select: { id: true },
      },
    );
    if (subscription) {
      const dailyGenerationLimit = await this.settingsService.getNumber(
        'limits.aiProDaily',
        this.configService.get<number>('AI_PUBLIC_PREMIUM_DAILY_LIMIT', 100),
      );
      return {
        plan: 'PRO',
        dailyGenerationLimit,
        advancedTools: true,
        generationEnabled,
        concurrencyLimit,
        rateLimitPerMinute,
        maxInputChars,
      };
    }
    const dailyGenerationLimit = await this.settingsService.getNumber(
      'limits.aiFreeDaily',
      this.configService.get<number>('AI_PUBLIC_FREE_DAILY_LIMIT', 10),
    );
    return {
      plan: 'FREE',
      dailyGenerationLimit,
      advancedTools: false,
      generationEnabled,
      concurrencyLimit,
      rateLimitPerMinute,
      maxInputChars,
    };
  }

  async internalDailyLimit() {
    return this.settingsService.getNumber(
      'limits.aiInternalDaily',
      this.configService.get<number>('AI_INTERNAL_DAILY_LIMIT', 50),
    );
  }
}
