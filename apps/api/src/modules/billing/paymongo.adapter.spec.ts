import { ServiceUnavailableException } from '@nestjs/common';

import { PayMongoAdapter } from './paymongo.adapter';

function adapter(configuration: Record<string, string>) {
  return new PayMongoAdapter({
    get: jest.fn((key: string, fallback?: string) =>
      key in configuration ? configuration[key] : fallback,
    ),
  } as never);
}

const checkoutInput = {
  amount: 29_900,
  currency: 'PHP',
  description: 'Vrompt Pro access',
  referenceNumber: 'payment-id',
  successUrl: 'https://vrompt.example/billing/success',
  cancelUrl: 'https://vrompt.example/billing/cancel',
  idempotencyKey: 'checkout-id',
};

describe('PayMongoAdapter security', () => {
  afterEach(() => jest.restoreAllMocks());

  it('fails closed when the API key does not match the configured mode', async () => {
    const subject = adapter({
      PAYMONGO_MODE: 'live',
      PAYMONGO_SECRET_KEY: 'sk_test_not_for_live',
    });

    await expect(
      subject.createCheckoutSession(checkoutInput),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects an untrusted checkout redirect returned by the provider', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'cs_test',
            attributes: { checkout_url: 'https://attacker.example/checkout' },
          },
        }),
        { status: 200 },
      ),
    );
    const subject = adapter({
      PAYMONGO_MODE: 'test',
      PAYMONGO_SECRET_KEY: 'sk_test_valid_for_unit_test',
    });

    await expect(
      subject.createCheckoutSession(checkoutInput),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
