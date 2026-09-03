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
  MembershipPlan,
  Prisma,
} from '@prisma/client';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { BillingSummary, PaymentGatewayAdapter } from './billing.types';

type PayMongoEvent = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
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
  ) {}

  plans() {
    const priceCentavos = this.config.get<number>('PAYMONGO_PRO_PRICE_CENTAVOS', 29900);
    const periodDays = this.config.get<number>('PAYMONGO_PRO_PERIOD_DAYS', 30);
    return {
      currency: 'PHP',
      plans: [
        {
          id: MembershipPlan.FREE,
          name: 'Free',
          priceCentavos: 0,
          billingPeriod: 'forever',
          features: ['Browse and search the public prompt library', 'Copy prompts', 'Limited AI generation'],
        },
        {
          id: MembershipPlan.PRO,
          name: 'Vrompt Pro',
          priceCentavos,
          billingPeriod: `${periodDays} days`,
          features: ['Higher AI generation allowance', 'Advanced generation tools', 'More room for saved workflows'],
        },
      ],
    };
  }

  async createCheckout(user: AuthenticatedUser, requestedKey?: string) {
    const idempotencyKey = this.normalizeIdempotencyKey(requestedKey);
    const now = new Date();
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
      throw new ConflictException('This checkout request is already processing');
    }

    const active = await this.prisma.billingSubscription.findFirst({
      where: {
        userId: user.id,
        plan: MembershipPlan.PRO,
        status: BillingSubscriptionStatus.ACTIVE,
        currentPeriodEnd: { gt: now },
      },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException('Vrompt Pro is already active');
    }

    const amount = this.config.get<number>('PAYMONGO_PRO_PRICE_CENTAVOS', 29900);
    const periodDays = this.config.get<number>('PAYMONGO_PRO_PERIOD_DAYS', 30);
    const subscription = await this.prisma.billingSubscription.create({
      data: {
        userId: user.id,
        plan: MembershipPlan.PRO,
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
        amount,
        currency: 'PHP',
        idempotencyKey,
      },
    });

    try {
      const webOrigin = this.config.get<string>('WEB_ORIGIN', 'http://localhost:3000');
      const result = await this.gateway.createCheckoutSession({
        amount,
        currency: 'PHP',
        description: 'Vrompt Pro access',
        referenceNumber: payment.id,
        successUrl: `${webOrigin}/billing/checkout?payment=${payment.id}&state=processing`,
        cancelUrl: `${webOrigin}/pricing?checkout=cancelled`,
        idempotencyKey,
      });
      await this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: {
          externalCheckoutSessionId: result.id,
          metadata: { checkoutUrl: result.checkoutUrl },
        },
      });
      await this.audit('BILLING_CHECKOUT_CREATED', 'BILLING_PAYMENT', payment.id, {
        provider: BillingProvider.PAYMONGO,
        amount,
        currency: 'PHP',
      });
      return {
        paymentId: payment.id,
        status: BillingPaymentStatus.PENDING,
        checkoutUrl: result.checkoutUrl,
      };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.billingPayment.update({
          where: { id: payment.id },
          data: { status: BillingPaymentStatus.FAILED, failureCode: 'CHECKOUT_CREATE_FAILED' },
        }),
        this.prisma.billingSubscription.update({
          where: { id: subscription.id },
          data: { status: BillingSubscriptionStatus.CANCELLED, canceledAt: new Date() },
        }),
      ]);
      throw error;
    }
  }

  async summary(userId: string): Promise<BillingSummary> {
    await this.expireStaleSubscriptions(userId);
    const [user, subscription, latestPayment] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
      this.prisma.billingSubscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
      }),
      this.prisma.billingPayment.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, amount: true, currency: true, createdAt: true },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    return {
      plan: user.plan,
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
    const payment = await this.prisma.billingPayment.findFirst({
      where: { id: paymentId, userId },
      select: { id: true, status: true, failureCode: true, subscription: { select: { status: true } } },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return {
      id: payment.id,
      status: payment.status,
      subscriptionStatus: payment.subscription?.status ?? null,
      failureCode: payment.status === BillingPaymentStatus.FAILED ? payment.failureCode : null,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.verifySignature(rawBody, signature)) {
      await this.audit('BILLING_WEBHOOK_REJECTED', 'BILLING_WEBHOOK', undefined, {
        reason: 'invalid_signature',
      });
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

    try {
      await this.prisma.billingWebhookEvent.create({
        data: {
          provider: BillingProvider.PAYMONGO,
          externalEventId: eventId,
          eventType,
          livemode: this.config.get<string>('PAYMONGO_MODE', 'test') === 'live',
          payloadHash: createHash('sha256').update(rawBody).digest('hex'),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        await this.audit('BILLING_WEBHOOK_DUPLICATE', 'BILLING_WEBHOOK', undefined, {
          eventType,
        });
        return { received: true, processed: false, duplicate: true };
      }
      throw error;
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
      await this.markWebhook(eventId, BillingWebhookStatus.FAILED, error instanceof Error ? 'PROCESSING_FAILED' : 'UNKNOWN_ERROR');
      this.logger.error(`Billing webhook processing failed for ${eventType}`);
      return { received: true, processed: false };
    }
  }

  private async processCheckoutPaid(event: PayMongoEvent) {
    const resource = event.data?.attributes?.data;
    const attributes = resource?.attributes ?? {};
    const reference = typeof attributes.reference_number === 'string'
      ? attributes.reference_number
      : typeof attributes.metadata === 'object' && attributes.metadata && 'reference_number' in attributes.metadata
        ? String((attributes.metadata as { reference_number?: unknown }).reference_number ?? '')
        : '';
    const payment = await this.prisma.billingPayment.findFirst({
      where: {
        OR: [
          ...(resource?.id ? [{ externalCheckoutSessionId: resource.id }] : []),
          ...(reference ? [{ id: reference }] : []),
        ],
      },
      include: { subscription: true },
    });
    if (!payment || !payment.subscription) return;
    if (payment.status === BillingPaymentStatus.PAID) return;
    if (typeof attributes.currency === 'string' && attributes.currency !== payment.currency) return;
    if (typeof attributes.amount === 'number' && attributes.amount !== payment.amount) return;

    const paymentId = typeof attributes.id === 'string' ? attributes.id : undefined;
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: {
          status: BillingPaymentStatus.PAID,
          externalPaymentId: paymentId,
          externalPaymentIntentId: typeof attributes.payment_intent_id === 'string' ? attributes.payment_intent_id : undefined,
          paidAt: new Date(),
        },
      }),
      this.prisma.billingSubscription.update({
        where: { id: payment.subscription.id },
        data: { status: BillingSubscriptionStatus.ACTIVE },
      }),
      this.prisma.user.update({
        where: { id: payment.userId },
        data: { plan: MembershipPlan.PRO },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'BILLING_PRO_ACTIVATED',
          targetType: 'BILLING_SUBSCRIPTION',
          targetId: payment.subscription.id,
          metadata: { paymentId: payment.id, provider: BillingProvider.PAYMONGO },
        },
      }),
    ]);
  }

  private async processPaymentFailed(event: PayMongoEvent) {
    const resource = event.data?.attributes?.data;
    const attributes = resource?.attributes ?? {};
    const externalPaymentId = typeof resource?.id === 'string' ? resource.id : '';
    if (!externalPaymentId) return;
    const payment = await this.prisma.billingPayment.findFirst({
      where: { externalPaymentId },
      include: { subscription: true },
    });
    if (!payment) return;
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({
        where: { id: payment.id },
        data: { status: BillingPaymentStatus.FAILED, failureCode: 'PROVIDER_PAYMENT_FAILED' },
      }),
      ...(payment.subscription
        ? [this.prisma.billingSubscription.update({
            where: { id: payment.subscription.id },
            data: { status: BillingSubscriptionStatus.CANCELLED, canceledAt: new Date() },
          })]
        : []),
      this.prisma.auditLog.create({
        data: { action: 'BILLING_PAYMENT_FAILED', targetType: 'BILLING_PAYMENT', targetId: payment.id, metadata: { providerStatus: attributes.status ?? 'failed' } },
      }),
    ]);
  }

  private async processPaymentRefunded(event: PayMongoEvent) {
    const resource = event.data?.attributes?.data;
    const externalPaymentId = typeof resource?.id === 'string' ? resource.id : '';
    if (!externalPaymentId) return;
    const payment = await this.prisma.billingPayment.findFirst({
      where: { externalPaymentId },
      include: { subscription: true },
    });
    if (!payment) return;
    await this.prisma.$transaction([
      this.prisma.billingPayment.update({ where: { id: payment.id }, data: { status: BillingPaymentStatus.REFUNDED } }),
      ...(payment.subscription
        ? [this.prisma.billingSubscription.update({ where: { id: payment.subscription.id }, data: { status: BillingSubscriptionStatus.REFUNDED } })]
        : []),
      this.prisma.user.update({ where: { id: payment.userId }, data: { plan: MembershipPlan.FREE } }),
      this.prisma.auditLog.create({ data: { action: 'BILLING_PAYMENT_REFUNDED', targetType: 'BILLING_PAYMENT', targetId: payment.id } }),
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
      await this.audit('BILLING_PRO_EXPIRED', 'BILLING_SUBSCRIPTION', undefined, { userId });
    }
  }

  private verifySignature(rawBody: Buffer, signatureHeader?: string) {
    const secret = this.config.get<string>('PAYMONGO_WEBHOOK_SECRET', '').trim();
    if (!secret || !signatureHeader) return false;
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => {
        const [key, ...value] = part.trim().split('=');
        return [key, value.join('=')];
      }),
    ) as Record<string, string | undefined>;
    const timestamp = parts.t;
    const expectedSignature = parts[this.config.get<string>('PAYMONGO_MODE', 'test') === 'live' ? 'li' : 'te'];
    if (!timestamp || !expectedSignature) return false;
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;
    const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex');
    const expected = Buffer.from(expectedSignature, 'utf8');
    const actual = Buffer.from(digest, 'utf8');
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private async markWebhook(id: string, status: BillingWebhookStatus, errorCode?: string) {
    await this.prisma.billingWebhookEvent.update({
      where: { externalEventId: id },
      data: { status, errorCode, processedAt: new Date() },
    });
  }

  private normalizeIdempotencyKey(value?: string) {
    const normalized = value?.trim();
    if (normalized && normalized.length <= 255 && /^[A-Za-z0-9._:-]+$/.test(normalized)) return normalized;
    return `vrompt-${createHash('sha256').update(`${Date.now()}:${Math.random()}`).digest('hex')}`;
  }

  private audit(action: Prisma.AuditLogCreateInput['action'], targetType: Prisma.AuditLogCreateInput['targetType'], targetId: string | undefined, metadata?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({ data: { action, targetType, targetId, metadata } });
  }
}
