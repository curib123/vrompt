import {
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { GenerationPolicy, GenerationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import { autoCredits, modelCredits } from './credits';

export function periods(now = new Date()) {
  return {
    day: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ),
    month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    nextDay: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    ),
    nextMonth: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    ),
  };
}

@Injectable()
export class QuotaService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private reconciling = false;
  constructor(private readonly prisma: PrismaService) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.reconcileExpired().catch(() => {});
    }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  async reconcileExpired() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const stale = await this.prisma.quotaReservation.findMany({
        where: { status: 'RESERVED', expiresAt: { lt: new Date() } },
        take: 100,
      });
      for (const reservation of stale)
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${reservation.userId}::uuid FOR UPDATE`;
          await this.finalizeIn(tx, reservation.id, 'INTERRUPTED', true);
          await tx.message.updateMany({
            where: { generationId: reservation.id, status: 'RESERVED' },
            data: { status: 'INTERRUPTED' },
          });
        });
    } finally {
      this.reconciling = false;
    }
  }

  async policies(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { guestKey: true },
    });
    const subscription = await this.prisma.billingSubscription.findFirst({
      where: { userId, status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
      orderBy: { currentPeriodEnd: 'desc' },
    });
    const plan = subscription?.planConfigId
      ? await this.prisma.billingPlan.findUnique({
          where: { id: subscription.planConfigId },
        })
      : await this.prisma.billingPlan.findUnique({
          where: {
            code: user?.guestKey ? 'GUEST' : subscription ? 'PRO' : 'FREE',
          },
        });
    const policies = plan
      ? await this.prisma.generationPolicy.findMany({
          where: { planId: plan.id, enabled: true },
          include: { model: true },
        })
      : [];
    return { plan, subscription, policies };
  }

  async reserve(
    userId: string,
    requestId: string,
    fingerprint: string,
    policy: GenerationPolicy,
    creditUnits = 1,
  ) {
    const now = new Date();
    const p = periods(now);
    return this.prisma.$transaction(async (tx) => {
      // One row lock serializes all allowance/concurrency changes for this user.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const existing = await tx.quotaReservation.findUnique({
        where: { id: requestId },
      });
      if (existing) {
        if (existing.userId !== userId || existing.fingerprint !== fingerprint)
          throw new ConflictException('Request ID already used');
        throw new ConflictException(
          'This request has already been submitted. Reload the conversation.',
        );
      }
      // A crashed process may have incurred provider cost: conservatively consume
      // the visible generation and mark it interrupted instead of silently refunding.
      const stale = await tx.quotaReservation.findMany({
        where: { userId, status: 'RESERVED', expiresAt: { lt: now } },
      });
      for (const reservation of stale)
        await this.finalizeIn(tx, reservation.id, 'INTERRUPTED', true);
      const active = await tx.quotaReservation.count({
        where: { userId, status: 'RESERVED' },
      });
      if (active >= policy.concurrency)
        throw new TooManyRequestsException(
          'Another response is still generating.',
        );
      const recent = await tx.quotaReservation.count({
        where: { userId, createdAt: { gte: new Date(now.getTime() - 60_000) } },
      });
      if (recent >= policy.ratePerMinute)
        throw new TooManyRequestsException(
          'Please wait before sending another request.',
        );
      const plan = await tx.billingPlan.findUniqueOrThrow({
        where: { id: policy.planId },
      });
      const creditKey = {
        userId,
        bucket: 'CREDITS',
        period: 'MONTHLY' as const,
        periodStart: p.month,
      };
      const credits = await tx.usageCounter.upsert({
        where: { userId_bucket_period_periodStart: creditKey },
        create: creditKey,
        update: {},
      });
      if (
        credits.used + credits.reserved + creditUnits >
        plan.monthlyCredits + credits.extra
      )
        throw new ForbiddenException(
          'Monthly credits reached. Upgrade to continue.',
        );
      await tx.usageCounter.update({
        where: { id: credits.id },
        data: { reserved: { increment: creditUnits } },
      });
      for (const [period, periodStart, limit] of [
        ['DAILY', p.day, policy.dailyLimit],
        ['MONTHLY', p.month, policy.monthlyLimit],
      ] as const) {
        const key = { userId, bucket: policy.bucket, period, periodStart };
        const counter = await tx.usageCounter.upsert({
          where: { userId_bucket_period_periodStart: key },
          create: key,
          update: {},
        });
        if (counter.used + counter.reserved >= limit + counter.extra)
          throw new ForbiddenException(
            `${period === 'DAILY' ? 'Daily' : 'Monthly'} generation allowance reached.`,
          );
        await tx.usageCounter.update({
          where: { id: counter.id },
          data: { reserved: { increment: 1 } },
        });
      }
      return tx.quotaReservation.create({
        data: {
          id: requestId,
          userId,
          bucket: policy.bucket,
          fingerprint,
          creditUnits,
          dayStart: p.day,
          monthStart: p.month,
          expiresAt: new Date(
            now.getTime() + (policy.maxDurationSeconds + 60) * 1000,
          ),
        },
      });
    });
  }

  async finalizeIn(
    tx: Prisma.TransactionClient,
    id: string,
    status: GenerationStatus,
    consume: boolean,
  ) {
    const reservation = await tx.quotaReservation.findUniqueOrThrow({
      where: { id },
    });
    const changed = await tx.quotaReservation.updateMany({
      where: { id, status: 'RESERVED' },
      data: { status, finalizedAt: new Date() },
    });
    if (!changed.count) return;
    if (reservation.creditUnits > 0)
      await tx.usageCounter.update({
        where: {
          userId_bucket_period_periodStart: {
            userId: reservation.userId,
            bucket: 'CREDITS',
            period: 'MONTHLY',
            periodStart: reservation.monthStart,
          },
        },
        data: {
          reserved: { decrement: reservation.creditUnits },
          used: { increment: consume ? reservation.creditUnits : 0 },
        },
      });
    for (const [period, periodStart] of [
      ['DAILY', reservation.dayStart],
      ['MONTHLY', reservation.monthStart],
    ] as const) {
      await tx.usageCounter.update({
        where: {
          userId_bucket_period_periodStart: {
            userId: reservation.userId,
            bucket: reservation.bucket,
            period,
            periodStart,
          },
        },
        data: {
          reserved: { decrement: 1 },
          used: { increment: consume ? 1 : 0 },
        },
      });
    }
  }

  async usage(userId: string) {
    const { plan, policies } = await this.policies(userId);
    const p = periods();
    const counters = await this.prisma.usageCounter.findMany({
      where: { userId, periodStart: { in: [p.day, p.month] } },
    });
    const creditCounter = counters.find(
      (counter) =>
        counter.bucket === 'CREDITS' &&
        counter.period === 'MONTHLY' &&
        +counter.periodStart === +p.month,
    );
    const creditLimit = Math.max(
      0,
      (plan?.monthlyCredits ?? 0) + (creditCounter?.extra ?? 0),
    );
    return {
      plan: plan?.name ?? 'Free',
      features: {
        projects: (plan?.maxProjects ?? 0) > 0,
        workflows: (plan?.maxWorkflows ?? 0) > 0,
        maxWorkflowSteps: plan?.maxWorkflowSteps ?? 0,
      },
      credits: {
        limit: creditLimit,
        used: creditCounter?.used ?? 0,
        reserved: creditCounter?.reserved ?? 0,
        remaining: Math.max(
          0,
          creditLimit -
            (creditCounter?.used ?? 0) -
            (creditCounter?.reserved ?? 0),
        ),
      },
      resets: { daily: p.nextDay, monthly: p.nextMonth },
      allowances: policies.map((policy) => {
        const daily = counters.find(
          (c) =>
            c.bucket === policy.bucket &&
            c.period === 'DAILY' &&
            +c.periodStart === +p.day,
        );
        const monthly = counters.find(
          (c) =>
            c.bucket === policy.bucket &&
            c.period === 'MONTHLY' &&
            +c.periodStart === +p.month,
        );
        return {
          bucket: policy.bucket,
          creditCosts: {
            chat: !policy.allowedFeatures.includes('chat')
              ? null
              : policy.bucket === 'AUTO'
                ? autoCredits(policy)
                : policy.model
                  ? modelCredits(policy.model, policy)
                  : null,
            image_generation: !policy.allowedFeatures.includes(
              'image_generation',
            )
              ? null
              : policy.bucket === 'AUTO'
                ? autoCredits(policy, 'image_generation')
                : policy.model
                  ? modelCredits(policy.model, policy, 'image_generation')
                  : null,
          },
          modelName:
            policy.bucket === 'AUTO'
              ? 'Auto'
              : (policy.model?.displayName ?? null),
          provider: policy.model?.provider ?? null,
          allowedFeatures: policy.allowedFeatures,
          dailyLimit: policy.dailyLimit + (daily?.extra ?? 0),
          monthlyLimit: policy.monthlyLimit + (monthly?.extra ?? 0),
          dailyRemaining: Math.max(
            0,
            policy.dailyLimit +
              (daily?.extra ?? 0) -
              (daily?.used ?? 0) -
              (daily?.reserved ?? 0),
          ),
          monthlyRemaining: Math.max(
            0,
            policy.monthlyLimit +
              (monthly?.extra ?? 0) -
              (monthly?.used ?? 0) -
              (monthly?.reserved ?? 0),
          ),
          maxFiles: policy.maxFiles,
          maxFileBytes: policy.maxFileBytes,
        };
      }),
    };
  }
}
