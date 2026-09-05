import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import Joi from 'joi';
import { PrismaService } from '../prisma/prisma.service';
import { validate } from './registry.service';

export function contribution(
  revenue: number,
  aiCost: number,
  variableCost: number,
) {
  const profit = revenue - aiCost - variableCost;
  return {
    revenue,
    aiCost,
    variableCost,
    contributionProfit: profit,
    margin: revenue > 0 ? profit / revenue : null,
  };
}
@Injectable()
export class EconomicsService {
  constructor(private readonly prisma: PrismaService) {}
  async append(actorId: string, input: unknown) {
    const data = validate<{
      id: string;
      kind: string;
      amount: number;
      currency: string;
      requestId: string | null;
      note: string;
    }>(
      Joi.object({
        id: Joi.string().uuid().required(),
        kind: Joi.string()
          .valid('AI_COST_ADJUSTMENT', 'VARIABLE_COST', 'REVENUE_ADJUSTMENT')
          .required(),
        amount: Joi.number().min(-1000000).max(1000000).precision(8).required(),
        currency: Joi.string()
          .pattern(/^[A-Z]{3}$/)
          .required(),
        requestId: Joi.string().uuid().allow(null).default(null),
        note: Joi.string().max(500).required(),
      }),
      input,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${data.id}))`;
      const existing = await tx.economicEntry.findUnique({
        where: { id: data.id },
      });
      if (existing) {
        if (
          existing.kind !== data.kind ||
          !existing.amount.equals(data.amount) ||
          existing.currency !== data.currency ||
          existing.requestId !== data.requestId ||
          existing.note !== data.note
        )
          throw new ConflictException('Accounting request ID already used.');
        return existing;
      }
      return tx.economicEntry.create({ data: { ...data, actorId } });
    });
  }
  async report(since: Date) {
    const [costs, payments, entries] = await Promise.all([
      this.prisma.usageRecord.groupBy({
        by: ['currency'],
        where: { createdAt: { gte: since } },
        _sum: { estimatedCost: true },
      }),
      this.prisma.billingPayment.groupBy({
        by: ['currency'],
        where: { status: 'PAID', paidAt: { gte: since } },
        _sum: { amount: true },
      }),
      this.prisma.economicEntry.groupBy({
        by: ['currency', 'kind'],
        where: { createdAt: { gte: since } },
        _sum: { amount: true },
      }),
    ]);
    const currencies = new Set(
      [...costs, ...payments, ...entries].map((r) => r.currency),
    );
    return [...currencies].map((currency) => {
      const adjustment = (kind: string) =>
        Number(
          entries.find((e) => e.currency === currency && e.kind === kind)?._sum
            .amount ?? 0,
        );
      const revenue =
        new Prisma.Decimal(
          payments.find((p) => p.currency === currency)?._sum.amount ?? 0,
        )
          .div(100)
          .toNumber() + adjustment('REVENUE_ADJUSTMENT');
      return {
        currency,
        ...contribution(
          revenue,
          Number(
            costs.find((c) => c.currency === currency)?._sum.estimatedCost ?? 0,
          ) + adjustment('AI_COST_ADJUSTMENT'),
          adjustment('VARIABLE_COST'),
        ),
      };
    });
  }
}
