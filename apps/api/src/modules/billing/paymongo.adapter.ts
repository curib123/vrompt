import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  CheckoutSessionResult,
  PaymentGatewayAdapter,
} from './billing.types';

type PayMongoResponse = {
  data?: {
    id?: string;
    attributes?: { checkout_url?: string };
  };
  errors?: Array<{ code?: string; detail?: string }>;
};

@Injectable()
export class PayMongoAdapter implements PaymentGatewayAdapter {
  private readonly logger = new Logger(PayMongoAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async createCheckoutSession(input: {
    amount: number;
    currency: string;
    description: string;
    referenceNumber: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
  }): Promise<CheckoutSessionResult> {
    const secretKey = this.config.get<string>('PAYMONGO_SECRET_KEY', '').trim();
    if (!secretKey) {
      throw new ServiceUnavailableException(
        'Payments are not configured. Please try again later.',
      );
    }
    const mode = this.config.get<string>('PAYMONGO_MODE', 'test');
    const expectedPrefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
    if (!secretKey.startsWith(expectedPrefix)) {
      this.logger.error('PayMongo key does not match the configured mode');
      throw new ServiceUnavailableException(
        'Payments are not configured. Please try again later.',
      );
    }

    const baseUrl = this.config.get<string>(
      'PAYMONGO_API_BASE_URL',
      'https://api.paymongo.com',
    );
    const configuredPaymentMethods = this.config
      .get<string>('PAYMONGO_PAYMENT_METHODS', 'card,gcash,qrph')
      .split(',')
      .map((method) => method.trim())
      .filter(Boolean);
    const paymentMethods =
      input.currency.toUpperCase() === 'PHP'
        ? configuredPaymentMethods
        : configuredPaymentMethods.filter((method) => method === 'card');
    if (paymentMethods.length === 0) paymentMethods.push('card');
    const authorization = Buffer.from(`${secretKey}:`).toString('base64');

    let response: Response;
    try {
      response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/v2/checkout_sessions`,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            authorization: `Basic ${authorization}`,
            'content-type': 'application/json',
            'idempotency-key': input.idempotencyKey,
          },
          body: JSON.stringify({
            data: {
              attributes: {
                cancel_url: input.cancelUrl,
                description: input.description,
                line_items: [
                  {
                    amount: input.amount,
                    currency: input.currency,
                    name: 'Vrompt Pro',
                    quantity: 1,
                  },
                ],
                metadata: { reference_number: input.referenceNumber },
                payment_method_types: paymentMethods,
                reference_number: input.referenceNumber,
                success_url: input.successUrl,
              },
            },
          }),
        },
      );
    } catch (error) {
      this.logger.warn(
        `PayMongo checkout request failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Payment provider is temporarily unavailable.',
      );
    }

    const body = (await response
      .json()
      .catch(() => null)) as PayMongoResponse | null;
    if (
      !response.ok ||
      !body?.data?.id ||
      !body.data.attributes?.checkout_url
    ) {
      this.logger.warn(
        `PayMongo checkout rejected with status ${response.status}`,
      );
      throw new ServiceUnavailableException(
        'Payment checkout could not be created. Please try again later.',
      );
    }

    const checkoutUrl = body.data.attributes.checkout_url;
    let parsedCheckoutUrl: URL;
    try {
      parsedCheckoutUrl = new URL(checkoutUrl);
    } catch {
      throw new ServiceUnavailableException(
        'Payment provider returned an invalid checkout.',
      );
    }
    if (
      parsedCheckoutUrl.protocol !== 'https:' ||
      (parsedCheckoutUrl.hostname !== 'checkout.paymongo.com' &&
        !parsedCheckoutUrl.hostname.endsWith('.checkout.paymongo.com'))
    ) {
      this.logger.error('PayMongo returned an untrusted checkout URL');
      throw new ServiceUnavailableException(
        'Payment provider returned an invalid checkout.',
      );
    }

    return { id: body.data.id, checkoutUrl };
  }
}
