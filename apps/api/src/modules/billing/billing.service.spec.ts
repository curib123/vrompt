import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

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

function buildService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    billingPayment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    billingSubscription: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    billingWebhookEvent: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { update: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const config = {
    get: jest.fn(
      (key: string, fallback?: unknown) =>
        ({ PAYMONGO_WEBHOOK_SECRET: 'secret', PAYMONGO_MODE: 'test' })[key] ??
        fallback,
    ),
  };
  const settings = { getNumber: jest.fn(), getBoolean: jest.fn() };
  const gateway = { createCheckoutSession: jest.fn() };
  Object.assign(prisma, overrides);
  return {
    service: new BillingService(
      prisma as never,
      config as never,
      gateway as never,
      settings as never,
    ),
    prisma,
  };
}

describe('BillingService webhook security', () => {
  it('rejects an invalid signature before processing the event', async () => {
    const { service, prisma } = buildService();
    const payload = {
      data: { id: 'evt_invalid', attributes: { type: 'payment.paid' } },
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
          data: {
            id: 'cs_session',
            attributes: {
              reference_number: 'payment-id',
              amount: 29900,
              currency: 'PHP',
              id: 'pay_external',
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
          data: {
            id: 'cs_session',
            attributes: {
              reference_number: 'payment-id',
              amount: 1,
              currency: 'PHP',
            },
          },
        },
      },
    };
    const { raw, signature } = signedPayload(payload, 'secret');

    await service.handleWebhook(raw, signature);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.billingWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSED' }),
      }),
    );
  });
});
