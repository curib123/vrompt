import type {
  BillingPaymentStatus,
  BillingSubscriptionStatus,
  MembershipPlan,
} from '@prisma/client';

export interface CheckoutSessionResult {
  id: string;
  checkoutUrl: string;
}

export interface PaymentGatewayAdapter {
  createCheckoutSession(input: {
    amount: number;
    currency: string;
    description: string;
    referenceNumber: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
  }): Promise<CheckoutSessionResult>;
}

export interface BillingSummary {
  plan: MembershipPlan;
  planCode?: string;
  planName?: string;
  subscription: {
    id: string;
    status: BillingSubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  latestPayment: {
    id: string;
    status: BillingPaymentStatus;
    amount: number;
    currency: string;
    createdAt: string;
  } | null;
}
