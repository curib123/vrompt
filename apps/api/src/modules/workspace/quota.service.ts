import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { GenerationPolicy, GenerationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';

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
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async policies(userId: string) {
    const subscription = await this.prisma.billingSubscription.findFirst({
      where: { userId, status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } },
      orderBy: { currentPeriodEnd: 'desc' },
    });
    const plan = subscription?.planConfigId
      ? await this.prisma.billingPlan.findUnique({
          where: { id: subscription.planConfigId },
        })
      : await this.prisma.billingPlan.findUnique({
          where: { code: subscription ? 'PRO' : 'FREE' },
        });
    const policies = plan
      ? await this.prisma.generationPolicy.findMany({
          where: { planId: plan.id, enabled: true },
        })
      : [];
    return { plan, subscription, policies };
  }

  async reserve(
    userId: string,
    requestId: string,
    fingerprint: string,
    policy: GenerationPolicy,
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
    return {
      plan: plan?.name ?? 'Free',
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
