import { z } from 'zod';
import { SubscriptionTier, BillingCycle } from '@portfolio-immortalized/domain';

export const MpesaStkPushRequestSchema = z.object({
  phoneNumber: z.string().min(9).max(15).regex(/^(\+?254|0)?[17]\d{8}$/, {
    message: 'Invalid Kenyan phone number format. Must be a valid Safaricom or Airtel mobile number.',
  }),
  tier: z.nativeEnum(SubscriptionTier),
  cycle: z.nativeEnum(BillingCycle),
  accountReference: z.string().optional(),
  transactionDesc: z.string().optional(),
});

export const MpesaCallbackItemSchema = z.object({
  Name: z.string(),
  Value: z.union([z.string(), z.number()]).optional(),
});

export const MpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z.object({
        Item: z.array(MpesaCallbackItemSchema),
      }).optional(),
    }),
  }),
});

export const StripeCheckoutRequestSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  cycle: z.nativeEnum(BillingCycle),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export const SubscriptionQuerySchema = z.object({
  userId: z.string().optional(),
});
