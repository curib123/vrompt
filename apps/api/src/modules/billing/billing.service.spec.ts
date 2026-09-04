import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';

import { BillingService } from './billing.service';

function signedPayload(payload: unknown, secret: string) {
  const raw = Buffer.from(JSON.stringify(payload));
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${raw.toString('utf8')}`)
    .digest('hex');
  return {
    raw,
    signature: `t=${timestamp},te=${signature},li=`,
  };
}

function currentlySignedPayload(payload: unknown, secret: string) {
  const raw = Buffer.from(JSON.stringify(payload));
  return {
    raw,
    signature: createHmac('sha256', secret).update(raw).digest('hex'),
  };
}

function buildService(overrides: Record<string, unknown> = {}) {
  const prisma: Record<string, any> = {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    billingPayment: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    billingSubscription: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    billingWebhookEvent: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    aiUsageEvent: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  prisma.$transaction = jest.fn((input: unknown) =>
    typeof input === 'function'
      ? (input as (transaction: Record<string, any>) => unknown)(prisma)
      : Promise.all(input as Promise<unknown>[]),
  );
  const config = {
    get: jest.fn(
      (key: string, fallback?: unknown) =>
        ({ PAYMONGO_WEBHOOK_SECRET: 'secret', PAYMONGO_MODE: 'test' })[key] ??
        fallback,
    ),
  };
  const settings = {
    getNumber: jest.fn().mockResolvedValue(30),
    getBoolean: jest.fn(),
  };
  const gateway = { createCheckoutSession: jest.fn() };
  const redis = { increment: jest.fn().mockResolvedValue(1) };
  Object.assign(prisma, overrides);
  return {
    service: new BillingService(
      prisma as never,
      config as never,
      gateway as never,
      settings as never,
      redis as never,
    ),
    prisma,
  };
}

describe('BillingService webhook security', () => {
  it('accepts the current raw-body HMAC signature format', async () => {
    const { service, prisma } = buildService();
    const payload = {
      data: {
        id: 'evt_current_signature',
        attributes: { type: 'unhandled.event', livemode: false },
      },
    };
    const { raw, signature } = currentlySignedPayload(payload, 'secret');

    await expect(service.handleWebhook(raw, signature)).resolves.toEqual({
      received: true,
      processed: false,
      ignored: true,
    });
    expect(prisma.billingWebhookEvent.create).toHaveBeenCalled();
  });

  it('rejects an invalid signature before processing the event', async () => {
    const { service, prisma } = buildService();
    const payload = {
      data: {
        id: 'evt_invalid',
        attributes: { type: 'payment.paid', livemode: false },
      },
    };

    await expect(
      service.handleWebhook(
        Buffer.from(JSON.stringify(payload)),
        't=1,te=bad,li=',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.billingWebhookEvent.create).not.toHaveBeenCalled();
  });

  it('activates Pro only for a signed, matching checkout payment', async () => {
    const { service, prisma } = buildService();
    const payment = {
      id: 'payment-id',
      userId: 'user-id',
      status: 'PENDING',
      amount: 29900,
      currency: 'PHP',
      subscription: { id: 'subscription-id' },
    };
    prisma.billingPayment.findFirst.mockResolvedValue(payment);
    const payload = {
      data: {
        id: 'evt_paid',
        attributes: {
          type: 'checkout_session.payment.paid',
          livemode: false,
          data: {
            id: 'cs_session',
            attributes: {
              reference_number: 'payment-id',
              livemode: false,
              payments: [
                {
                  id: 'pay_external',
                  attributes: {
                    amount: 29900,
                    currency: 'PHP',
                    status: 'paid',
                    payment_intent_id: 'pi_external',
                  },
                },
              ],
            },
          },
        },
      },
    };
    const { raw, signature } = signedPayload(payload, 'secret');

    await expect(service.handleWebhook(raw, signature)).resolves.toEqual({
      received: true,
      processed: true,
    });
    expect(prisma.billingPayment.findFirst).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { plan: 'PRO' },
    });
  });

  it('does not grant access when a signed event amount does not match', async () => {
    const { service, prisma } = buildService();
    prisma.billingPayment.findFirst.mockResolvedValue({
      id: 'payment-id',
      userId: 'user-id',
      status: 'PENDING',
      amount: 29900,
      currency: 'PHP',
      subscription: { id: 'subscription-id' },
    });
    const payload = {
      data: {
        id: 'evt_wrong_amount',
        attributes: {
          type: 'checkout_session.payment.paid',
          livemode: false,
          data: {
            id: 'cs_session',
            attributes: {
              reference_number: 'payment-id',
              livemode: false,
              payments: [
                {
                  id: 'pay_external',
                  attributes: {
                    amount: 1,
                    currency: 'PHP',
                    status: 'paid',
                  },
                },
              ],
            },
          },
        },
      },
    };
    const { raw, signature } = signedPayload(payload, 'secret');

    await expect(service.handleWebhook(raw, signature)).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.billingWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('acknowledges a duplicate event without processing it again', async () => {
    const { service, prisma } = buildService();
    prisma.billingWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.12.0',
      }),
    );
    const payload = {
      data: {
        id: 'evt_duplicate',
        attributes: { type: 'payment.paid', livemode: false },
      },
    };
    const { raw, signature } = signedPayload(payload, 'secret');

    await expect(service.handleWebhook(raw, signature)).resolves.toEqual({
      received: true,
      processed: false,
      duplicate: true,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'BILLING_WEBHOOK_DUPLICATE' }),
      }),
    );
  });

  it('reclaims a previously failed event so provider retries can recover', async () => {
    const { service, prisma } = buildService();
    prisma.billingWebhookEvent.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.12.0',
      }),
    );
    prisma.billingWebhookEvent.updateMany.mockResolvedValue({ count: 1 });
    const payload = {
      data: {
        id: 'evt_retry',
        attributes: { type: 'unhandled.event', livemode: false },
      },
    };
    const { raw, signature } = currentlySignedPayload(payload, 'secret');

    await expect(service.handleWebhook(raw, signature)).resolves.toEqual({
      received: true,
      processed: false,
      ignored: true,
    });
    expect(prisma.billingWebhookEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('rejects a correctly signed event from the wrong PayMongo mode', async () => {
    const { service, prisma } = buildService();
    const payload = {
      data: {
        id: 'evt_live_in_test',
        attributes: { type: 'payment.paid', livemode: true },
      },
    };
    const { raw, signature } = currentlySignedPayload(payload, 'secret');

    await expect(service.handleWebhook(raw, signature)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.billingWebhookEvent.create).not.toHaveBeenCalled();
  });
});

describe('BillingService freemium analytics', () => {
  it('calculates plan share, conversion, revenue, and usage by plan', async () => {
    const { service, prisma } = buildService();
    prisma.user.count.mockResolvedValueOnce(80).mockResolvedValueOnce(20);
    prisma.billingPayment.groupBy.mockResolvedValue([
      { status: 'PAID', _count: { _all: 10 } },
      { status: 'FAILED', _count: { _all: 5 } },
      { status: 'PENDING', _count: { _all: 5 } },
    ]);
    prisma.billingPayment.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 299_000 } })
      .mockResolvedValueOnce({ _sum: { amount: 89_700 } });
    prisma.aiUsageEvent.findMany.mockResolvedValue([
      { units: 2, user: null },
      { units: 3, user: { plan: 'FREE' } },
      { units: 4, user: { plan: 'PRO' } },
    ]);

    await expect(service.adminOverview()).resolves.toMatchObject({
      users: { free: 80, pro: 20 },
      aiUsageToday: 9,
      usageByPlan: { GUEST: 2, FREE: 3, PRO: 4 },
      analytics: {
        proSharePercent: 20,
        checkoutConversionPercent: 50,
        retainedRevenueCentavos: 299_000,
        retainedRevenue30DaysCentavos: 89_700,
        currency: 'USD',
      },
    });
  });
});
