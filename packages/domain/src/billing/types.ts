/**
 * Domain Types for Billing, Subscriptions, M-Pesa & Stripe Gateways
 * Reference: TDD Chapter 34, Appendix A (OD-08, OD-15)
 */

export enum SubscriptionTier {
  STARTER = 'STARTER',
  HERITAGE = 'HERITAGE',
  DYNASTY = 'DYNASTY',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL',
  LIFETIME = 'LIFETIME',
}

export enum PaymentGateway {
  MPESA = 'MPESA',
  STRIPE = 'STRIPE',
  IN_APP_APPLE = 'IN_APP_APPLE',
  IN_APP_GOOGLE = 'IN_APP_GOOGLE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  UNPAID = 'UNPAID',
}

export interface TierQuota {
  tier: SubscriptionTier;
  storageBytesLimit: number; // e.g. 1GB, 25GB, 100GB
  maxTrustees: number;
  maxBeneficiaries: number;
  allowVideoAudioMemos: boolean;
  allowWillBuilder: boolean;
  priorityTriage: boolean;
}

export const TIER_QUOTAS: Record<SubscriptionTier, TierQuota> = {
  [SubscriptionTier.STARTER]: {
    tier: SubscriptionTier.STARTER,
    storageBytesLimit: 1 * 1024 * 1024 * 1024, // 1 GB
    maxTrustees: 2,
    maxBeneficiaries: 3,
    allowVideoAudioMemos: false,
    allowWillBuilder: false,
    priorityTriage: false,
  },
  [SubscriptionTier.HERITAGE]: {
    tier: SubscriptionTier.HERITAGE,
    storageBytesLimit: 25 * 1024 * 1024 * 1024, // 25 GB
    maxTrustees: 5,
    maxBeneficiaries: 20,
    allowVideoAudioMemos: true,
    allowWillBuilder: true,
    priorityTriage: true,
  },
  [SubscriptionTier.DYNASTY]: {
    tier: SubscriptionTier.DYNASTY,
    storageBytesLimit: 100 * 1024 * 1024 * 1024, // 100 GB
    maxTrustees: 999,
    maxBeneficiaries: 999,
    allowVideoAudioMemos: true,
    allowWillBuilder: true,
    priorityTriage: true,
  },
};

export interface SubscriptionRecord {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  cycle: BillingCycle;
  status: SubscriptionStatus;
  gateway: PaymentGateway;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceRecord {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  currency: 'KES' | 'USD' | 'EUR' | 'GBP';
  gateway: PaymentGateway;
  transactionReference: string;
  paidAt?: Date;
  receiptUrl?: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: Date;
}

export interface MpesaStkPushRequest {
  userId: string;
  phoneNumber: string; // E.164 or 2547XXXXXXXX
  amount: number;
  tier: SubscriptionTier;
  cycle: BillingCycle;
  accountReference?: string;
  transactionDesc?: string;
}

export interface MpesaStkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface MpesaCallbackItem {
  Name: string;
  Value?: string | number;
}

export interface MpesaCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: MpesaCallbackItem[];
      };
    };
  };
}

export interface StripeCheckoutRequest {
  userId: string;
  userEmail: string;
  tier: SubscriptionTier;
  cycle: BillingCycle;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
}
