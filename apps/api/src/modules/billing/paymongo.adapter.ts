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

    const baseUrl = this.config.get<string>(
      'PAYMONGO_API_BASE_URL',
      'https://api.paymongo.com',
    );
    const paymentMethods = this.config
      .get<string>('PAYMONGO_PAYMENT_METHODS', 'card,gcash,qrph')
      .split(',')
      .map((method) => method.trim())
      .filter(Boolean);
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

    return {
      id: body.data.id,
      checkoutUrl: body.data.attributes.checkout_url,
    };
  }
}
