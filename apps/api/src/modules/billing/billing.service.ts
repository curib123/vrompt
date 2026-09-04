import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BillingPaymentStatus,
  BillingProvider,
  BillingSubscriptionStatus,
  BillingWebhookStatus,
  DiscountType,
  MembershipPlan,
  PromotionMode,
  Prisma,
} from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { AuthenticatedUser } from '../auth/auth.types';
import { TooManyRequestsException } from '../../common/exceptions/too-many-requests.exception';
import { RedisService } from '../common/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import type { BillingSummary, PaymentGatewayAdapter } from './billing.types';
import type {
  CreateDiscountCodeDto,
  UpdateDiscountCodeDto,
} from './dto/create-discount-code.dto';

type PayMongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      livemode?: boolean;
      created_at?: number;
      data?: {
        id?: string;
        type?: string;
        attributes?: Record<string, unknown>;
      };
    };
  };
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject('PAYMENT_GATEWAY') private readonly gateway: PaymentGatewayAdapter,
    private readonly settings: SettingsService,
    private readonly redis: RedisService,
  ) {}

  async plans() {
    const priceCentavos = await this.settings.getNumber(
      'billing.proPriceCentavos',
      this.config.get<number>('PAYMONGO_PRO_PRICE_CENTAVOS', 599),
    );
    const periodDays = await this.settings.getNumber(
      'billing.proPeriodDays',
      this.config.get<number>('PAYMONGO_PRO_PERIOD_DAYS', 30),
    );
    return {
      currency: 'USD',
      plans: [
        {
          id: MembershipPlan.FREE,
          name: 'Free',
          priceCentavos: 0,
          billingPeriod: 'forever',
          features: [
            'Browse and search the public prompt library',
            'Copy prompts',
            'Daily-limited AI generation and refinement tools',
          ],
        },
        {
          id: MembershipPlan.PRO,
          name: 'Vrompt Pro',
          priceCentavos,
          billingPeriod: `${periodDays} days · one-time payment`,
          features: [
            'Unlimited AI generation and refinement tools while Pro is active',
            'More room for saved workflows',
          ],
        },
      ],
    };
  }

  async createCheckout(
    user: AuthenticatedUser,
    requestedKey?: string,
    requestedDiscountCode?: string,
    requestedPlanCode = 'PRO',
  ) {
    const checkoutAttempts = await this.redis.increment(
      `billing:checkout:${user.id}`,
      3_600,
    );
    if (
      checkoutAttempts >
      this.config.get<number>('PAYMONGO_CHECKOUT_RATE_LIMIT_PER_HOUR', 5)
    ) {
      throw new TooManyRequestsException(
        'Too many checkout attempts. Please try again later.',
      );
    }
    const idempotencyKey = this.normalizeIdempotencyKey(requestedKey);
    const now = new Date();
    await this.expireStaleSubscriptions(user.id);
    const existing = await this.prisma.billingPayment.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        userId: true,
        status: true,
        externalCheckoutSessionId: true,
        metadata: true,
      },
    });
    if (existing) {
      if (existing.userId !== user.id) {
        throw new ForbiddenException('Checkout request is not available');
      }
      if (existing.externalCheckoutSessionId) {
        return {
          paymentId: existing.id,
          status: existing.status,
          checkoutUrl: (existing.metadata as { checkoutUrl?: string } | null)
            ?.checkoutUrl,
        };
      }
      throw new ConflictException(
        'This checkout request is already processing',
      );
    }

    const openSubscription = await this.prisma.billingSubscription.findFirst({
      where: {
        userId: user.id,
        plan: MembershipPlan.PRO,
        status: {
          in: [
            BillingSubscriptionStatus.PENDING,
            BillingSubscriptionStatus.ACTIVE,
          ],
        },
      },
      include: {
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (
      openSubscription?.status === BillingSubscriptionStatus.ACTIVE &&
      openSubscription.currentPeriodEnd > now
    ) {
      throw new ConflictException('Vrompt Pro is already active');
    }
    const pendingPayment = openSubscription?.payments[0];
    if (pendingPayment?.status === BillingPaymentStatus.PENDING) {
      await this.expirePendingPayment(pendingPayment.id, user.id);
      const refreshed = await this.prisma.billingPayment.findUnique({
        where: { id: pendingPayment.id },
        select: { status: true, metadata: true },
      });
      if (refreshed?.status === BillingPaymentStatus.PENDING) {
        return {
          paymentId: pendingPayment.id,
          status: refreshed.status,
          checkoutUrl: (refreshed.metadata as { checkoutUrl?: string } | null)
            ?.checkoutUrl,
        };
      }
    }

    const configuredPlan = await this.resolveConfiguredPlan(requestedPlanCode);
    const amount =
      configuredPlan?.originalPrice ??
      (await this.settings.getNumber(
        'billing.proPriceCentavos',
        this.config.get<number>('PAYMONGO_PRO_PRICE_CENTAVOS', 599),
      ));
    const promotion = configuredPlan
      ? await this.resolvePromotion(
          user.id,
          configuredPlan.id,
          amount,
          requestedDiscountCode,
          now,
        )
      : null;
    const discount = promotion
      ? null
      : await this.resolveDiscount(user.id, amount, requestedDiscountCode, now);
    const discountAmount =
      promotion?.discountAmount ?? discount?.discountAmount ?? 0;
    const finalAmount = amount - discountAmount;
    if (finalAmount < 100) {
      throw new ConflictException(
        'The discount cannot reduce the checkout below the minimum payment amount.',
      );
    }
    const periodDays = configuredPlan
      ? this.planPeriodDays(
          configuredPlan.billingInterval,
          configuredPlan.intervalCount,
        )
      : await this.settings.getNumber(
          'billing.proPeriodDays',
          this.config.get<number>('PAYMONGO_PRO_PERIOD_DAYS', 30),
        );
    const subscription = await this.prisma.billingSubscription.create({
      data: {
        userId: user.id,
        plan: MembershipPlan.PRO,
        planConfigId: configuredPlan?.id,
        provider: BillingProvider.PAYMONGO,
        status: BillingSubscriptionStatus.PENDING,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + periodDays * 86_400_000),
      },
    });
    const payment = await this.prisma.billingPayment.create({
      data: {
        userId: user.id,
        subscriptionId: subscription.id,
        provider: BillingProvider.PAYMONGO,
        plan: MembershipPlan.PRO,
        planConfigId: configuredPlan?.id,
        promotionId: promotion?.id,
        amount: finalAmount,
        originalAmount: amount,
        discountAmount,
        currency: configuredPlan?.currency ?? 'USD',
        idempotencyKey,
        discountCodeId: discount?.id,
      },
    });
    if (promotion) {
      try {
        await this.reservePromotion(
          promotion.id,
          user.id,
          payment.id,
          promotion.discountAmount,
          now,
        );
      } catch (error) {
        await this.prisma.$transaction([
          this.prisma.billingPayment.update({
            where: { id: payment.id },
            data: { status: BillingPaymentStatus.CANCELLED },
          }),
          this.prisma.billingSubscription.update({
            where: { id: subscription.id },
            data: {
              status: BillingSubscriptionStatus.CANCELLED,
              canceledAt: now,
            },
          }),
        ]);
        throw error;
      }
    }

    try {
      const webOrigin = this.config.get<string>(
        'WEB_ORIGIN',
        'http://localhost:3000',
      );
      const result = await this.gateway.createCheckoutSession({
        amount: finalAmount,
        currency: configuredPlan?.currency ?? 'USD',
        description: `${configuredPlan?.name ?? 'Vrompt Pro'} access`,
        referenceNumber: payment.id,
        successUrl: `${webOrigin}/billing/checkout?payment=${payment.id}&state=processing`,
        cancelUrl: `${webOrigin}/billing/checkout?payment=${payment.id}&state=cancelled`,
        idempotencyKey,
      });
      await this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: {
          externalCheckoutSessionId: result.id,
          metadata: { checkoutUrl: result.checkoutUrl },
        },
      });
      await this.audit(
        'BILLING_CHECKOUT_CREATED',
        'BILLING_PAYMENT',
        payment.id,
        {
          provider: BillingProvider.PAYMONGO,
          amount: finalAmount,
          originalAmount: amount,
          discountCode: discount?.code,
          promotion: promotion?.name,
          currency: configuredPlan?.currency ?? 'USD',
        },
        user.id,
      );
      return {
        paymentId: payment.id,
        status: BillingPaymentStatus.PENDING,
        checkoutUrl: result.checkoutUrl,
      };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.billingPayment.update({
          where: { id: payment.id },
          data: {
            status: BillingPaymentStatus.FAILED,
            failureCode: 'CHECKOUT_CREATE_FAILED',
          },
        }),
        this.prisma.billingSubscription.update({
          where: { id: subscription.id },
          data: {
            status: BillingSubscriptionStatus.CANCELLED,
            canceledAt: new Date(),
          },
        }),
      ]);
      await this.releaseDiscountReservation(discount?.id);
      await this.releasePromotionReservation(payment.id, promotion?.id);
      throw error;
    }
  }

  async summary(userId: string): Promise<BillingSummary> {
    await this.expireStaleSubscriptions(userId);
    const [user, subscription, latestPayment] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
      }),
      this.prisma.billingSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      }),
      this.prisma.billingPayment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    const hasActiveSubscription = Boolean(
      subscription &&
      subscription.status === BillingSubscriptionStatus.ACTIVE &&
      subscription.currentPeriodEnd > new Date(),
    );
    return {
      plan: hasActiveSubscription ? MembershipPlan.PRO : MembershipPlan.FREE,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          }
        : null,
      latestPayment: latestPayment
        ? { ...latestPayment, createdAt: latestPayment.createdAt.toISOString() }
        : null,
    };
  }

  async paymentStatus(paymentId: string, userId: string) {
    await this.expirePendingPayment(paymentId, userId);
    const payment = await this.prisma.billingPayment.findFirst({
      where: { id: paymentId, userId },
      select: {
        id: true,
        status: true,
        failureCode: true,
        subscription: { select: { status: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return {
      id: payment.id,
      status: payment.status,
      subscriptionStatus: payment.subscription?.status ?? null,
      failureCode:
        payment.status === BillingPaymentStatus.FAILED
          ? payment.failureCode
          : null,
    };
  }

  async cancelPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { id: paymentId, userId },
      select: {
        id: true,
        status: true,
        subscriptionId: true,
        discountCodeId: true,
        promotionId: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status === BillingPaymentStatus.PENDING) {
      await this.prisma.$transaction([
        this.prisma.billingPayment.update({
          where: { id: payment.id },
          data: { status: BillingPaymentStatus.CANCELLED },
        }),
        ...(payment.subscriptionId
          ? [
              this.prisma.billingSubscription.update({
                where: { id: payment.subscriptionId },
                data: {
                  status: BillingSubscriptionStatus.CANCELLED,
                  canceledAt: new Date(),
                },
              }),
            ]
          : []),
      ]);
      await this.releaseDiscountReservation(payment.discountCodeId);
      await this.releasePromotionReservation(payment.id, payment.promotionId);
    }
    return this.paymentStatus(paymentId, userId);
  }

  async listDiscountCodes() {
    return this.prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        value: true,
        maxDiscountAmount: true,
        startsAt: true,
        endsAt: true,
        isActive: true,
        maxRedemptions: true,
        maxRedemptionsPerUser: true,
        redemptionCount: true,
        createdAt: true,
      },
    });
  }

  async createDiscountCode(input: CreateDiscountCodeDto) {
    const data = this.normalizeDiscountInput(input);
    this.validateDiscountInput(data);
    return this.prisma.discountCode.create({ data });
  }

  async updateDiscountCode(id: string, input: UpdateDiscountCodeDto) {
    const data = this.normalizeDiscountInput(input);
    this.validateDiscountInput(data);
    return this.prisma.discountCode.update({ where: { id }, data });
  }

  private async resolveConfiguredPlan(code: string) {
    // Older isolated unit fixtures predate the dynamic plan delegate.
    if (!this.prisma.billingPlan?.findUnique) return null;
    const normalized = code.trim().toUpperCase();
    const plan = await this.prisma.billingPlan.findUnique({
      where: { code: normalized },
    });
    if (
      !plan ||
      !plan.isActive ||
      plan.originalPrice <= 0 ||
      !plan.legacyPlan
    ) {
      throw new ConflictException('This paid plan is not available.');
    }
    return plan;
  }

  private async resolvePromotion(
    userId: string,
    planId: string,
    originalAmount: number,
    requestedCode: string | undefined,
    now: Date,
  ) {
    const code = requestedCode?.trim().toUpperCase();
    const candidates = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
        plans: { some: { planId } },
        ...(code
          ? { mode: PromotionMode.CODE, code }
          : { mode: PromotionMode.AUTOMATIC }),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (code && candidates.length === 0) return null;
    const previousPurchases = await this.prisma.billingPayment.count({
      where: { userId, status: BillingPaymentStatus.PAID },
    });
    const eligible = candidates.filter(
      (item) =>
        (!item.newUsersOnly || previousPurchases === 0) &&
        (item.minimumPurchase === null ||
          originalAmount >= item.minimumPurchase) &&
        (item.maximumRedemptions === null ||
          item.redemptionCount < item.maximumRedemptions),
    );
    const priced = eligible.map((item) => ({
      ...item,
      discountAmount: Math.min(
        originalAmount,
        item.discountType === DiscountType.PERCENTAGE
          ? Math.floor((originalAmount * item.discountValue) / 100)
          : item.discountValue,
      ),
    }));
    return (
      priced.sort((a, b) => b.discountAmount - a.discountAmount)[0] ?? null
    );
  }

  private async reservePromotion(
    promotionId: string,
    userId: string,
    paymentId: string,
    amount: number,
    now: Date,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const promotion = await tx.promotion.findUnique({
          where: { id: promotionId },
        });
        if (
          !promotion ||
          !promotion.isActive ||
          promotion.startsAt > now ||
          promotion.endsAt <= now
        )
          throw new ConflictException('This promotion is no longer available.');
        if (promotion.perUserRedemptionLimit !== null) {
          const used = await tx.promotionRedemption.count({
            where: { promotionId, userId },
          });
          if (used >= promotion.perUserRedemptionLimit)
            throw new ConflictException(
              'You have already used this promotion.',
            );
        }
        const claimed = await tx.promotion.updateMany({
          where: {
            id: promotionId,
            isActive: true,
            startsAt: { lte: now },
            endsAt: { gt: now },
            ...(promotion.maximumRedemptions === null
              ? {}
              : { redemptionCount: { lt: promotion.maximumRedemptions } }),
          },
          data: { redemptionCount: { increment: 1 } },
        });
        if (claimed.count !== 1)
          throw new ConflictException(
            'This promotion has reached its redemption limit.',
          );
        await tx.promotionRedemption.create({
          data: { promotionId, userId, paymentId, amount },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async releasePromotionReservation(
    paymentId: string,
    promotionId?: string | null,
  ) {
    if (!promotionId) return;
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.promotionRedemption.deleteMany({
        where: { paymentId, promotionId },
      });
      if (removed.count)
        await tx.promotion.updateMany({
          where: { id: promotionId, redemptionCount: { gt: 0 } },
          data: { redemptionCount: { decrement: 1 } },
        });
    });
  }

  private planPeriodDays(interval: string, count: number) {
    const days =
      interval === 'DAY'
        ? 1
        : interval === 'WEEK'
          ? 7
          : interval === 'YEAR'
            ? 365
            : 30;
    return days * count;
  }

  private async resolveDiscount(
    userId: string,
    originalAmount: number,
    requestedCode: string | undefined,
    now: Date,
  ) {
    const code = requestedCode?.trim().toUpperCase();
    if (!code) return null;
    const discount = await this.prisma.discountCode.findUnique({
      where: { code },
    });
    if (
      !discount ||
      !discount.isActive ||
      discount.startsAt > now ||
      discount.endsAt <= now
    ) {
      throw new ConflictException('This discount code is not available.');
    }
    if (
      discount.type === DiscountType.PERCENTAGE &&
      (discount.value < 1 || discount.value > 100)
    ) {
      throw new ConflictException('This discount code is misconfigured.');
    }
    const userRedemptions = await this.prisma.billingPayment.count({
      where: {
        userId,
        discountCodeId: discount.id,
        status: {
          in: [BillingPaymentStatus.PENDING, BillingPaymentStatus.PAID],
        },
      },
    });
    if (userRedemptions >= discount.maxRedemptionsPerUser) {
      throw new ConflictException('You have already used this discount code.');
    }
    const discountAmount = Math.min(
      originalAmount,
      discount.type === DiscountType.PERCENTAGE
        ? Math.floor((originalAmount * discount.value) / 100)
        : discount.value,
      discount.maxDiscountAmount ?? originalAmount,
    );
    const reserved = await this.prisma.discountCode.updateMany({
      where: {
        id: discount.id,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gt: now },
        ...(discount.maxRedemptions === null
          ? {}
          : { redemptionCount: { lt: discount.maxRedemptions } }),
      },
      data: { redemptionCount: { increment: 1 } },
    });
    if (reserved.count !== 1) {
      throw new ConflictException('This discount code has reached its limit.');
    }
    return { ...discount, discountAmount };
  }

  private async releaseDiscountReservation(discountId?: string | null) {
    if (!discountId) return;
    await this.prisma.discountCode.updateMany({
      where: { id: discountId, redemptionCount: { gt: 0 } },
      data: { redemptionCount: { decrement: 1 } },
    });
  }

  private normalizeDiscountInput(input: CreateDiscountCodeDto) {
    return {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      value: input.value,
      maxDiscountAmount: input.maxDiscountAmount ?? null,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      isActive: input.isActive ?? true,
      maxRedemptions: input.maxRedemptions ?? null,
      maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? 1,
    };
  }

  private validateDiscountInput(
    input: ReturnType<typeof this.normalizeDiscountInput>,
  ) {
    if (
      !input.code ||
      !Number.isFinite(input.startsAt.getTime()) ||
      !Number.isFinite(input.endsAt.getTime()) ||
      input.endsAt <= input.startsAt
    ) {
      throw new ConflictException('Discount dates and code must be valid.');
    }
    if (input.type === DiscountType.PERCENTAGE && input.value > 100) {
      throw new ConflictException('Percentage discounts must be 1 to 100.');
    }
  }

  async adminOverview() {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const last30Days = new Date(now.getTime() - 30 * 86_400_000);
    const [
      freeUsers,
      proUsers,
      payments,
      activeSubscriptions,
      failedWebhooks,
      paidRevenue,
      paidRevenue30Days,
    ] = await Promise.all([
      this.prisma.user.count({ where: { plan: MembershipPlan.FREE } }),
      this.prisma.user.count({ where: { plan: MembershipPlan.PRO } }),
      this.prisma.billingPayment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.billingSubscription.count({
        where: {
          plan: MembershipPlan.PRO,
          status: BillingSubscriptionStatus.ACTIVE,
          currentPeriodEnd: { gt: new Date() },
        },
      }),
      this.prisma.billingWebhookEvent.count({
        where: { status: BillingWebhookStatus.FAILED },
      }),
      this.prisma.billingPayment.aggregate({
        where: { status: BillingPaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.billingPayment.aggregate({
        where: {
          status: BillingPaymentStatus.PAID,
          paidAt: { gte: last30Days },
        },
        _sum: { amount: true },
      }),
    ]);
    const usageRows = await this.prisma.aiUsageEvent.findMany({
      where: { createdAt: { gte: today } },
      select: {
        units: true,
        user: { select: { plan: true } },
      },
    });
    const usageByPlan = usageRows.reduce(
      (totals, row) => {
        const key = row.user?.plan ?? 'GUEST';
        totals[key] += row.units;
        return totals;
      },
      { GUEST: 0, FREE: 0, PRO: 0 },
    );
    const paymentCounts = Object.fromEntries(
      payments.map((item) => [item.status, item._count._all]),
    ) as Record<string, number>;
    const totalUsers = freeUsers + proUsers;
    const checkoutCount = Object.values(paymentCounts).reduce(
      (total, count) => total + count,
      0,
    );
    const paidCount = paymentCounts[BillingPaymentStatus.PAID] ?? 0;
    const aiUsageToday = Object.values(usageByPlan).reduce(
      (total, units) => total + units,
      0,
    );
    return {
      users: { free: freeUsers, pro: proUsers },
      activeSubscriptions,
      aiUsageToday,
      usageByPlan,
      failedWebhooks,
      payments: paymentCounts,
      analytics: {
        proSharePercent: totalUsers
          ? Math.round((proUsers / totalUsers) * 10_000) / 100
          : 0,
        checkoutConversionPercent: checkoutCount
          ? Math.round((paidCount / checkoutCount) * 10_000) / 100
          : 0,
        retainedRevenueCentavos: paidRevenue._sum.amount ?? 0,
        retainedRevenue30DaysCentavos: paidRevenue30Days._sum.amount ?? 0,
        currency: 'USD',
      },
    };
  }

  async adminPayments() {
    return this.prisma.billingPayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        plan: true,
        status: true,
        amount: true,
        currency: true,
        createdAt: true,
        paidAt: true,
        user: { select: { username: true, email: true, plan: true } },
      },
    });
  }

  async adminWebhookFailures() {
    return this.prisma.billingWebhookEvent.findMany({
      where: { status: BillingWebhookStatus.FAILED },
      orderBy: { receivedAt: 'desc' },
      take: 50,
      select: {
        externalEventId: true,
        eventType: true,
        status: true,
        errorCode: true,
        receivedAt: true,
      },
    });
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.verifySignature(rawBody, signature)) {
      await this.audit(
        'BILLING_WEBHOOK_REJECTED',
        'BILLING_WEBHOOK',
        undefined,
        {
          reason: 'invalid_signature',
        },
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }
    let event: PayMongoEvent;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as PayMongoEvent;
    } catch {
      throw new UnauthorizedException('Invalid webhook payload');
    }
    const eventId = event.data?.id;
    const eventType = event.data?.attributes?.type;
    if (!eventId || !eventType) return { received: true, processed: false };

    const expectedLiveMode =
      this.config.get<string>('PAYMONGO_MODE', 'test') === 'live';
    if (event.data?.attributes?.livemode !== expectedLiveMode) {
      await this.audit(
        'BILLING_WEBHOOK_REJECTED',
        'BILLING_WEBHOOK',
        undefined,
        { reason: 'mode_mismatch', eventType },
      );
      throw new UnauthorizedException('Invalid webhook environment');
    }

    let retryingFailedEvent = false;
    try {
      await this.prisma.billingWebhookEvent.create({
        data: {
          provider: BillingProvider.PAYMONGO,
          externalEventId: eventId,
          eventType,
          livemode: expectedLiveMode,
          payloadHash: createHash('sha256').update(rawBody).digest('hex'),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const claimed = await this.prisma.billingWebhookEvent.updateMany({
          where: {
            externalEventId: eventId,
            status: BillingWebhookStatus.FAILED,
          },
          data: {
            status: BillingWebhookStatus.RECEIVED,
            errorCode: null,
            processedAt: null,
          },
        });
        if (claimed.count === 1) {
          retryingFailedEvent = true;
        } else {
          await this.audit(
            'BILLING_WEBHOOK_DUPLICATE',
            'BILLING_WEBHOOK',
            undefined,
            {
              eventType,
            },
          );
          return { received: true, processed: false, duplicate: true };
        }
      }
      if (!retryingFailedEvent) throw error;
    }

    try {
      if (eventType === 'checkout_session.payment.paid') {
        await this.processCheckoutPaid(event);
      } else if (eventType === 'payment.failed') {
        await this.processPaymentFailed(event);
      } else if (eventType === 'payment.refunded') {
        await this.processPaymentRefunded(event);
      } else {
        await this.markWebhook(eventId, BillingWebhookStatus.IGNORED);
        return { received: true, processed: false, ignored: true };
      }
      await this.markWebhook(eventId, BillingWebhookStatus.PROCESSED);
      return { received: true, processed: true };
    } catch (error) {
      await this.markWebhook(
        eventId,
        BillingWebhookStatus.FAILED,
        error instanceof Error ? 'PROCESSING_FAILED' : 'UNKNOWN_ERROR',
      );
      this.logger.error(`Billing webhook processing failed for ${eventType}`);
      throw error;
    }
  }

  private async processCheckoutPaid(event: PayMongoEvent) {
    const resource = event.data?.attributes?.data;
    const attributes = resource?.attributes ?? {};
    const reference =
      typeof attributes.reference_number === 'string'
        ? attributes.reference_number
        : typeof attributes.metadata === 'object' &&
            attributes.metadata &&
            'reference_number' in attributes.metadata
          ? String(
              (attributes.metadata as { reference_number?: unknown })
                .reference_number ?? '',
            )
          : '';
    if (!resource?.id || !reference)
      throw new Error('Missing checkout identity');
    const payment = await this.prisma.billingPayment.findFirst({
      where: { id: reference, externalCheckoutSessionId: resource.id },
      include: { subscription: true },
    });
    if (!payment || !payment.subscription)
      throw new Error('Unknown checkout session');
    if (payment.status === BillingPaymentStatus.PAID) return;
    const gatewayPayments = Array.isArray(attributes.payments)
      ? (attributes.payments as Array<{
          id?: unknown;
          attributes?: Record<string, unknown>;
        }>)
      : [];
    const gatewayPayment = gatewayPayments.find(
      (item) => item?.attributes?.status === 'paid',
    );
    const gatewayAttributes = gatewayPayment?.attributes;
    const paymentIntent =
      typeof attributes.payment_intent === 'object' && attributes.payment_intent
        ? (attributes.payment_intent as {
            id?: unknown;
            attributes?: Record<string, unknown>;
          })
        : undefined;
    const gatewayPaymentIntentId =
      typeof gatewayAttributes?.payment_intent_id === 'string'
        ? gatewayAttributes.payment_intent_id
        : undefined;
    if (
      !gatewayPayment ||
      typeof gatewayPayment.id !== 'string' ||
      gatewayAttributes?.amount !== payment.amount ||
      gatewayAttributes.currency !== payment.currency ||
      attributes.livemode !==
        (this.config.get<string>('PAYMONGO_MODE', 'test') === 'live')
    ) {
      throw new Error('Checkout payment did not match local payment');
    }
    const gatewayPaymentId = gatewayPayment.id;

    const periodDays = await this.settings.getNumber(
      'billing.proPeriodDays',
      this.config.get<number>('PAYMONGO_PRO_PERIOD_DAYS', 30),
    );
    const activatedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.billingPayment.updateMany({
        where: {
          id: payment.id,
          status: {
            in: [
              BillingPaymentStatus.PENDING,
              BillingPaymentStatus.REQUIRES_ACTION,
              BillingPaymentStatus.CANCELLED,
              BillingPaymentStatus.EXPIRED,
            ],
          },
        },
        data: {
          status: BillingPaymentStatus.PAID,
          externalPaymentId: gatewayPaymentId,
          externalPaymentIntentId:
            typeof paymentIntent?.id === 'string'
              ? paymentIntent.id
              : gatewayPaymentIntentId,
          paidAt: activatedAt,
          failureCode: null,
        },
      });
      if (updated.count !== 1) return;
      await transaction.billingSubscription.update({
        where: { id: payment.subscription!.id },
        data: {
          status: BillingSubscriptionStatus.ACTIVE,
          currentPeriodStart: activatedAt,
          currentPeriodEnd: new Date(
            activatedAt.getTime() + periodDays * 86_400_000,
          ),
          canceledAt: null,
        },
      });
      await transaction.user.update({
        where: { id: payment.userId },
        data: { plan: MembershipPlan.PRO },
      });
      await transaction.auditLog.create({
        data: {
          action: 'BILLING_PRO_ACTIVATED',
          targetType: 'BILLING_SUBSCRIPTION',
          targetId: payment.subscription!.id,
          metadata: {
            paymentId: payment.id,
            provider: BillingProvider.PAYMONGO,
          },
        },
      });
    });
  }

  private async processPaymentFailed(event: PayMongoEvent) {
    const resource = event.data?.attributes?.data;
    const attributes = resource?.attributes ?? {};
    const externalPaymentId =
      typeof resource?.id === 'string' ? resource.id : '';
    if (!externalPaymentId) return;
    const payment = await this.prisma.billingPayment.findFirst({
      where: { externalPaymentId },
      include: { subscription: true },
    });
    if (!payment) return;
    if (payment.status === BillingPaymentStatus.PAID) return;
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: {
          status: BillingPaymentStatus.FAILED,
          failureCode: 'PROVIDER_PAYMENT_FAILED',
        },
      }),
      ...(payment.subscription
        ? [
            this.prisma.billingSubscription.update({
              where: { id: payment.subscription.id },
              data: {
                status: BillingSubscriptionStatus.CANCELLED,
                canceledAt: new Date(),
              },
            }),
          ]
        : []),
      this.prisma.auditLog.create({
        data: {
          action: 'BILLING_PAYMENT_FAILED',
          targetType: 'BILLING_PAYMENT',
          targetId: payment.id,
          metadata: { providerStatus: attributes.status ?? 'failed' },
        },
      }),
    ]);
  }

  private async processPaymentRefunded(event: PayMongoEvent) {
    const resource = event.data?.attributes?.data;
    const externalPaymentId =
      typeof resource?.id === 'string' ? resource.id : '';
    if (!externalPaymentId) return;
    const payment = await this.prisma.billingPayment.findFirst({
      where: { externalPaymentId },
      include: { subscription: true },
    });
    if (!payment) return;
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: BillingPaymentStatus.REFUNDED },
      }),
      ...(payment.subscription
        ? [
            this.prisma.billingSubscription.update({
              where: { id: payment.subscription.id },
              data: { status: BillingSubscriptionStatus.REFUNDED },
            }),
          ]
        : []),
      this.prisma.user.update({
        where: { id: payment.userId },
        data: { plan: MembershipPlan.FREE },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'BILLING_PAYMENT_REFUNDED',
          targetType: 'BILLING_PAYMENT',
          targetId: payment.id,
        },
      }),
    ]);
  }

  private async expireStaleSubscriptions(userId: string) {
    const result = await this.prisma.billingSubscription.updateMany({
      where: {
        userId,
        status: BillingSubscriptionStatus.ACTIVE,
        currentPeriodEnd: { lte: new Date() },
      },
      data: { status: BillingSubscriptionStatus.EXPIRED },
    });
    if (result.count > 0) {
      await this.prisma.user.updateMany({
        where: { id: userId, plan: MembershipPlan.PRO },
        data: { plan: MembershipPlan.FREE },
      });
      await this.audit(
        'BILLING_PRO_EXPIRED',
        'BILLING_SUBSCRIPTION',
        undefined,
        { userId },
      );
    }
  }

  private async expirePendingPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.billingPayment.findFirst({
      where: { id: paymentId, userId, status: BillingPaymentStatus.PENDING },
      select: {
        id: true,
        subscriptionId: true,
        discountCodeId: true,
        promotionId: true,
        createdAt: true,
      },
    });
    const expiryHours = this.config.get<number>(
      'PAYMONGO_CHECKOUT_EXPIRY_HOURS',
      24,
    );
    if (
      !payment ||
      payment.createdAt.getTime() > Date.now() - expiryHours * 3_600_000
    )
      return;
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: BillingPaymentStatus.EXPIRED },
      }),
      ...(payment.subscriptionId
        ? [
            this.prisma.billingSubscription.update({
              where: { id: payment.subscriptionId },
              data: {
                status: BillingSubscriptionStatus.EXPIRED,
                canceledAt: new Date(),
              },
            }),
          ]
        : []),
    ]);
    await this.releaseDiscountReservation(payment.discountCodeId);
    await this.releasePromotionReservation(payment.id, payment.promotionId);
  }

  private verifySignature(rawBody: Buffer, signatureHeader?: string) {
    const secret = this.config
      .get<string>('PAYMONGO_WEBHOOK_SECRET', '')
      .trim();
    if (!secret || !signatureHeader) return false;
    const rawDigest = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (this.safeEqual(signatureHeader.trim(), rawDigest)) return true;

    // Older PayMongo endpoints use the timestamped t/te/li format. Supporting
    // it keeps existing registered endpoints valid during key rotation.
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => {
        const [key, ...value] = part.trim().split('=');
        return [key, value.join('=')];
      }),
    ) as Record<string, string | undefined>;
    const timestamp = parts.t;
    const expectedSignature =
      parts[
        this.config.get<string>('PAYMONGO_MODE', 'test') === 'live'
          ? 'li'
          : 'te'
      ];
    if (!timestamp || !expectedSignature) return false;
    const timestampSeconds = Number(timestamp);
    if (
      !Number.isFinite(timestampSeconds) ||
      Math.abs(Date.now() / 1000 - timestampSeconds) > 300
    )
      return false;
    const digest = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    return this.safeEqual(expectedSignature, digest);
  }

  private safeEqual(left: string, right: string) {
    const expected = Buffer.from(left, 'utf8');
    const actual = Buffer.from(right, 'utf8');
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private async markWebhook(
    id: string,
    status: BillingWebhookStatus,
    errorCode?: string,
  ) {
    await this.prisma.billingWebhookEvent.update({
      where: { externalEventId: id },
      data: { status, errorCode, processedAt: new Date() },
    });
  }

  private normalizeIdempotencyKey(value?: string) {
    const normalized = value?.trim();
    if (
      normalized &&
      normalized.length <= 255 &&
      /^[A-Za-z0-9._:-]+$/.test(normalized)
    )
      return normalized;
    return `vrompt-${createHash('sha256').update(`${Date.now()}:${Math.random()}`).digest('hex')}`;
  }

  private audit(
    action: Prisma.AuditLogCreateInput['action'],
    targetType: Prisma.AuditLogCreateInput['targetType'],
    targetId: string | undefined,
    metadata?: Prisma.InputJsonValue,
    actorId?: string,
  ) {
    return this.prisma.auditLog.create({
      data: { action, targetType, targetId, metadata, actorId },
    });
  }
}
