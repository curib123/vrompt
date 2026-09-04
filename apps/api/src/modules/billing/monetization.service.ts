import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PromotionMode, UsageResetPeriod } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type {
  UpsertPlanDto,
  UpsertPromotionDto,
} from './dto/monetization-admin.dto';

@Injectable()
export class MonetizationService {
  constructor(private readonly prisma: PrismaService) {}

  async publicPlans(now = new Date()) {
    const plans = await this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        limits: { include: { feature: true }, orderBy: { resetPeriod: 'asc' } },
        promotions: {
          where: {
            promotion: {
              isActive: true,
              mode: PromotionMode.AUTOMATIC,
              startsAt: { lte: now },
              endsAt: { gt: now },
            },
          },
          include: { promotion: true },
        },
      },
    });
    return {
      currency: plans[0]?.currency ?? 'PHP',
      plans: plans.map((plan) => {
        const promotion = plan.promotions
          .map(({ promotion }) => promotion)
          .filter(
            (item) =>
              item.maximumRedemptions === null ||
              item.redemptionCount < item.maximumRedemptions,
          )
          .sort(
            (a, b) =>
              this.discountFor(plan.originalPrice, b) -
              this.discountFor(plan.originalPrice, a),
          )[0];
        const discountAmount = promotion
          ? this.discountFor(plan.originalPrice, promotion)
          : 0;
        return {
          id: plan.code,
          name: plan.name,
          description: plan.description,
          originalPrice: plan.originalPrice,
          priceCentavos: plan.originalPrice - discountAmount,
          currency: plan.currency,
          billingInterval: plan.billingInterval,
          intervalCount: plan.intervalCount,
          billingPeriod: this.billingLabel(
            plan.billingInterval,
            plan.intervalCount,
          ),
          features: plan.limits.map((item) => ({
            key: item.feature.key,
            name: item.feature.name,
            unitLabel: item.feature.unitLabel,
            resetPeriod: item.resetPeriod,
            limit: item.limit,
          })),
          promotion: promotion
            ? {
                name: promotion.name,
                description: promotion.description,
                discountType: promotion.discountType,
                discountValue: promotion.discountValue,
                discountAmount,
                startsAt: promotion.startsAt.toISOString(),
                endsAt: promotion.endsAt.toISOString(),
                timezone: promotion.timezone,
              }
            : null,
        };
      }),
    };
  }

  async usage(userId: string, featureKey?: string, now = new Date()) {
    const plan = await this.activePlan(userId, now);
    const limits = plan.limits.filter(
      ({ feature }) => !featureKey || feature.key === featureKey,
    );
    const rows = await Promise.all(
      limits.map(async (item) => {
        const period = this.period(item.resetPeriod, now);
        const bucket = await this.prisma.featureUsageBucket.findUnique({
          where: {
            userId_featureId_resetPeriod_periodStart: {
              userId,
              featureId: item.featureId,
              resetPeriod: item.resetPeriod,
              periodStart: period.start,
            },
          },
          select: { used: true },
        });
        const used = bucket?.used ?? 0;
        return {
          featureKey: item.feature.key,
          featureName: item.feature.name,
          unitLabel: item.feature.unitLabel,
          resetPeriod: item.resetPeriod,
          used,
          limit: item.limit,
          remaining:
            item.limit === null ? null : Math.max(item.limit - used, 0),
          warning:
            item.limit !== null && used * 100 >= item.limit * item.warningAt,
          reached: item.limit !== null && used >= item.limit,
          resetAt: period.end.toISOString(),
        };
      }),
    );
    return { plan: plan.code, usage: rows };
  }

  async reserveUsage(input: {
    userId: string;
    featureKey: string;
    requestKey: string;
    units?: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    const units = input.units ?? 1;
    if (!Number.isInteger(units) || units < 1)
      throw new ConflictException('Usage units must be a positive integer.');
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const plan = await this.activePlan(input.userId, now, tx);
          const limits = plan.limits.filter(
            ({ feature }) => feature.key === input.featureKey,
          );
          if (!limits.length)
            throw new NotFoundException(
              'Feature is not configured for this plan.',
            );
          for (const limit of limits) {
            const requestKey = `${input.requestKey}:${limit.resetPeriod}`;
            const previous = await tx.featureUsageEvent.findUnique({
              where: { requestKey },
            });
            if (previous) continue;
            const period = this.period(limit.resetPeriod, now);
            const bucket = await tx.featureUsageBucket.upsert({
              where: {
                userId_featureId_resetPeriod_periodStart: {
                  userId: input.userId,
                  featureId: limit.featureId,
                  resetPeriod: limit.resetPeriod,
                  periodStart: period.start,
                },
              },
              create: {
                userId: input.userId,
                featureId: limit.featureId,
                resetPeriod: limit.resetPeriod,
                periodStart: period.start,
                periodEnd: period.end,
              },
              update: {},
            });
            const updated = await tx.featureUsageBucket.updateMany({
              where: {
                id: bucket.id,
                ...(limit.limit === null
                  ? {}
                  : { used: { lte: limit.limit - units } }),
              },
              data: { used: { increment: units } },
            });
            if (updated.count !== 1) {
              throw new HttpException(
                `${limit.feature.name} ${limit.resetPeriod.toLowerCase()} limit reached. Upgrade your plan for more usage.`,
                HttpStatus.TOO_MANY_REQUESTS,
              );
            }
            await tx.featureUsageEvent.create({
              data: {
                userId: input.userId,
                featureId: limit.featureId,
                bucketId: bucket.id,
                requestKey,
                units,
                metadata: input.metadata,
              },
            });
          }
          return { accepted: true, featureKey: input.featureKey };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        const actor = await this.prisma.user.findUnique({
          where: { id: input.userId },
          select: { accountType: true },
        });
        await this.prisma.analyticsEvent.create({
          data: {
            name: 'plan_limit_reached',
            actorId: input.userId,
            accountType: actor?.accountType,
            metadata: { feature: input.featureKey, units },
          },
        });
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Usage changed concurrently. Please retry.',
        );
      }
      throw error;
    }
  }

  adminConfiguration() {
    return Promise.all([
      this.prisma.billingPlan.findMany({
        orderBy: { displayOrder: 'asc' },
        include: { limits: { include: { feature: true } } },
      }),
      this.prisma.promotion.findMany({
        orderBy: { createdAt: 'desc' },
        include: { plans: true },
      }),
    ]).then(([plans, promotions]) => ({ plans, promotions }));
  }

  async createPlan(input: UpsertPlanDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.billingPlan.create({
        data: {
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          description: input.description.trim(),
          originalPrice: input.originalPrice,
          currency: input.currency.toUpperCase(),
          billingInterval: input.billingInterval,
          intervalCount: input.intervalCount,
          isActive: input.isActive ?? true,
          displayOrder: input.displayOrder,
        },
      });
      await this.replaceLimits(tx, plan.id, input.limits);
      await tx.pricingHistory.create({
        data: {
          planId: plan.id,
          actorId,
          changeType: 'PLAN_CREATED',
          after: input as unknown as Prisma.InputJsonValue,
        },
      });
      return plan;
    });
  }

  async updatePlan(id: string, input: UpsertPlanDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.billingPlan.findUnique({
        where: { id },
        include: { limits: true },
      });
      if (!before) throw new NotFoundException('Plan not found.');
      const plan = await tx.billingPlan.update({
        where: { id },
        data: {
          code: input.code.trim().toUpperCase(),
          name: input.name.trim(),
          description: input.description.trim(),
          originalPrice: input.originalPrice,
          currency: input.currency.toUpperCase(),
          billingInterval: input.billingInterval,
          intervalCount: input.intervalCount,
          isActive: input.isActive ?? true,
          displayOrder: input.displayOrder,
        },
      });
      await tx.planFeatureLimit.deleteMany({ where: { planId: id } });
      await this.replaceLimits(tx, id, input.limits);
      await tx.pricingHistory.create({
        data: {
          planId: id,
          actorId,
          changeType: 'PLAN_UPDATED',
          before: before as unknown as Prisma.InputJsonValue,
          after: input as unknown as Prisma.InputJsonValue,
        },
      });
      return plan;
    });
  }

  async createPromotion(input: UpsertPromotionDto, actorId: string) {
    const data = this.promotionData(input);
    return this.prisma.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({
        data: {
          ...data,
          plans: { create: input.planIds.map((planId) => ({ planId })) },
        },
      });
      await tx.pricingHistory.create({
        data: {
          promotionId: promotion.id,
          actorId,
          changeType: 'PROMOTION_CREATED',
          after: input as unknown as Prisma.InputJsonValue,
        },
      });
      return promotion;
    });
  }

  async updatePromotion(
    id: string,
    input: UpsertPromotionDto,
    actorId: string,
  ) {
    const data = this.promotionData(input);
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.promotion.findUnique({
        where: { id },
        include: { plans: true },
      });
      if (!before) throw new NotFoundException('Promotion not found.');
      const promotion = await tx.promotion.update({ where: { id }, data });
      await tx.promotionPlan.deleteMany({ where: { promotionId: id } });
      await tx.promotionPlan.createMany({
        data: input.planIds.map((planId) => ({ promotionId: id, planId })),
      });
      await tx.pricingHistory.create({
        data: {
          promotionId: id,
          actorId,
          changeType: 'PROMOTION_UPDATED',
          before: before as unknown as Prisma.InputJsonValue,
          after: input as unknown as Prisma.InputJsonValue,
        },
      });
      return promotion;
    });
  }

  private async replaceLimits(
    tx: Prisma.TransactionClient,
    planId: string,
    limits: UpsertPlanDto['limits'],
  ) {
    for (const item of limits) {
      const feature = await tx.featureDefinition.upsert({
        where: { key: item.featureKey.trim().toLowerCase() },
        create: {
          key: item.featureKey.trim().toLowerCase(),
          name: item.featureName.trim(),
          description: item.description?.trim(),
          unitLabel: item.unitLabel?.trim() || 'uses',
        },
        update: {
          name: item.featureName.trim(),
          description: item.description?.trim(),
          unitLabel: item.unitLabel?.trim() || 'uses',
        },
      });
      await tx.planFeatureLimit.create({
        data: {
          planId,
          featureId: feature.id,
          resetPeriod: item.resetPeriod,
          limit: item.limit ?? null,
          warningAt: item.warningAt ?? 80,
        },
      });
    }
  }

  private promotionData(input: UpsertPromotionDto) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    try {
      new Intl.DateTimeFormat('en', { timeZone: input.timezone }).format();
    } catch {
      throw new ConflictException('Promotion timezone is invalid.');
    }
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      endsAt <= startsAt
    )
      throw new ConflictException('Promotion end must be after its start.');
    if (input.discountType === 'PERCENTAGE' && input.discountValue > 100)
      throw new ConflictException('Percentage discounts cannot exceed 100%.');
    if (input.mode === 'CODE' && !input.code?.trim())
      throw new ConflictException('Code promotions require a code.');
    return {
      name: input.name.trim(),
      code: input.code?.trim().toUpperCase() || null,
      description: input.description?.trim() || null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      startsAt,
      endsAt,
      timezone: input.timezone,
      isActive: input.isActive ?? true,
      mode: input.mode,
      maximumRedemptions: input.maximumRedemptions ?? null,
      perUserRedemptionLimit: input.perUserRedemptionLimit ?? null,
      newUsersOnly: input.newUsersOnly ?? false,
      minimumPurchase: input.minimumPurchase ?? null,
    };
  }

  private async activePlan(
    userId: string,
    now: Date,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const subscription = await client.billingSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gt: now },
        planConfigId: { not: null },
      },
      orderBy: { currentPeriodEnd: 'desc' },
      include: {
        planConfig: { include: { limits: { include: { feature: true } } } },
      },
    });
    if (subscription?.planConfig?.isActive) return subscription.planConfig;
    const free = await client.billingPlan.findUnique({
      where: { code: 'FREE' },
      include: { limits: { include: { feature: true } } },
    });
    if (!free) throw new NotFoundException('Free plan is not configured.');
    return free;
  }

  private discountFor(
    price: number,
    promotion: {
      discountType: string;
      discountValue: number;
      minimumPurchase: number | null;
    },
  ) {
    if (promotion.minimumPurchase !== null && price < promotion.minimumPurchase)
      return 0;
    return Math.min(
      price,
      promotion.discountType === 'PERCENTAGE'
        ? Math.floor((price * promotion.discountValue) / 100)
        : promotion.discountValue,
    );
  }

  private period(reset: UsageResetPeriod, now: Date) {
    const start = new Date(now);
    if (reset === UsageResetPeriod.DAILY) start.setUTCHours(0, 0, 0, 0);
    else {
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
    }
    const end = new Date(start);
    if (reset === UsageResetPeriod.DAILY) end.setUTCDate(end.getUTCDate() + 1);
    else end.setUTCMonth(end.getUTCMonth() + 1);
    return { start, end };
  }

  private billingLabel(interval: string, count: number) {
    if (interval === 'ONE_TIME') return 'one-time';
    return `every ${count > 1 ? `${count} ` : ''}${interval.toLowerCase()}${count > 1 ? 's' : ''}`;
  }
}
