import { describe, it, expect, beforeEach } from 'vitest';
import {
  SubscriptionTier,
  BillingCycle,
  PaymentGateway,
  MpesaCallbackPayload,
} from '@portfolio-immortalized/domain';
import { BillingDal } from '../src/dal/billing-dal.js';
import { MpesaService } from '../src/billing/mpesa-service.js';
import { StripeService } from '../src/billing/stripe-service.js';
import {
  TierQuotaEnforcer,
  QuotaExceededError,
  FeatureNotAllowedError,
} from '../src/billing/tier-enforcer.js';
import { AuditService } from '../src/audit/logger.js';

describe('Billing & Monetization Engine (Stage 11)', () => {
  let auditService: AuditService;
  let billingDal: BillingDal;
  let mpesaService: MpesaService;
  let stripeService: StripeService;
  let quotaEnforcer: TierQuotaEnforcer;

  beforeEach(() => {
    auditService = new AuditService();
    billingDal = new BillingDal(auditService);
    mpesaService = new MpesaService({ billingDal, auditService });
    stripeService = new StripeService({ billingDal, auditService });
    quotaEnforcer = new TierQuotaEnforcer(billingDal);
  });

  describe('BillingDal Foundations', () => {
    it('returns default STARTER subscription for a new user', async () => {
      const sub = await billingDal.getSubscription('user_new_01');
      expect(sub.userId).toBe('user_new_01');
      expect(sub.tier).toBe(SubscriptionTier.STARTER);
      expect(sub.status).toBe('ACTIVE');
    });

    it('updates subscription tier, cycle, and payment gateway', async () => {
      const updated = await billingDal.updateSubscription(
        { userId: 'user_new_01' },
        SubscriptionTier.HERITAGE,
        BillingCycle.ANNUAL,
        PaymentGateway.MPESA,
        'mpesa_receipt_123'
      );

      expect(updated.tier).toBe(SubscriptionTier.HERITAGE);
      expect(updated.cycle).toBe(BillingCycle.ANNUAL);
      expect(updated.gateway).toBe(PaymentGateway.MPESA);
      expect(updated.externalSubscriptionId).toBe('mpesa_receipt_123');

      // Verify re-query
      const queried = await billingDal.getSubscription('user_new_01');
      expect(queried.tier).toBe(SubscriptionTier.HERITAGE);
    });

    it('records and lists invoices for a user', async () => {
      await billingDal.recordInvoice({
        subscriptionId: 'sub_test_01',
        userId: 'user_inv_01',
        amount: 4999,
        currency: 'KES',
        gateway: PaymentGateway.MPESA,
        transactionReference: 'QWE123RTY',
        status: 'PAID',
      });

      const invoices = await billingDal.getUserInvoices({ userId: 'user_inv_01' }, 'user_inv_01');
      expect(invoices).toHaveLength(1);
      expect(invoices[0]!.amount).toBe(4999);
      expect(invoices[0]!.currency).toBe('KES');
      expect(invoices[0]!.status).toBe('PAID');
    });
  });

  describe('M-Pesa Daraja 2.0 STK Push Service', () => {
    it('generates valid Daraja base64 password', () => {
      const pw = mpesaService.generatePassword('20261021120000');
      expect(typeof pw).toBe('string');
      const decoded = Buffer.from(pw, 'base64').toString('utf-8');
      expect(decoded).toContain('174379');
      expect(decoded).toContain('20261021120000');
    });

    it('initiates STK push and stores pending transaction record', async () => {
      const session = { userId: 'usr_mpesa_test' };
      const response = await mpesaService.initiateStkPush(session, {
        phoneNumber: '0712345678',
        amount: 4999,
        tier: SubscriptionTier.HERITAGE,
        cycle: BillingCycle.ANNUAL,
        userId: session.userId,
      });

      expect(response.responseCode).toBe('0');
      expect(response.checkoutRequestId).toBeDefined();
      expect(response.customerMessage).toContain('enter your M-Pesa PIN');

      const pending = mpesaService.pendingTransactions.get(response.checkoutRequestId);
      expect(pending).toBeDefined();
      expect(pending?.userId).toBe('usr_mpesa_test');
      expect(pending?.amount).toBe(4999);
      expect(pending?.tier).toBe(SubscriptionTier.HERITAGE);
    });

    it('processes successful M-Pesa callback (ResultCode 0) and activates subscription', async () => {
      const session = { userId: 'usr_mpesa_success' };
      const initiateRes = await mpesaService.initiateStkPush(session, {
        phoneNumber: '0722000000',
        amount: 14999,
        tier: SubscriptionTier.DYNASTY,
        cycle: BillingCycle.ANNUAL,
        userId: session.userId,
      });

      const callbackPayload: MpesaCallbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: initiateRes.merchantRequestId,
            CheckoutRequestID: initiateRes.checkoutRequestId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 14999 },
                { Name: 'MpesaReceiptNumber', Value: 'QGH891XYZ' },
                { Name: 'TransactionDate', Value: 20261021120530 },
                { Name: 'PhoneNumber', Value: 254722000000 },
              ],
            },
          },
        },
      };

      const result = await mpesaService.processCallback(callbackPayload);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Subscription activated');

      // Verify subscription updated
      const sub = await billingDal.getSubscription('usr_mpesa_success');
      expect(sub.tier).toBe(SubscriptionTier.DYNASTY);
      expect(sub.gateway).toBe(PaymentGateway.MPESA);
      expect(sub.externalSubscriptionId).toBe('QGH891XYZ');

      // Verify invoice recorded
      const invoices = await billingDal.getUserInvoices({ userId: 'usr_mpesa_success' }, 'usr_mpesa_success');
      expect(invoices).toHaveLength(1);
      expect(invoices[0]!.status).toBe('PAID');
      expect(invoices[0]!.transactionReference).toBe('QGH891XYZ');

      // Verify pending tx cleared
      expect(mpesaService.pendingTransactions.has(initiateRes.checkoutRequestId)).toBe(false);
    });

    it('processes failed/cancelled M-Pesa callback (ResultCode != 0) without activating tier', async () => {
      const session = { userId: 'usr_mpesa_fail' };
      const initiateRes = await mpesaService.initiateStkPush(session, {
        phoneNumber: '0722111111',
        amount: 4999,
        tier: SubscriptionTier.HERITAGE,
        cycle: BillingCycle.ANNUAL,
        userId: session.userId,
      });

      const callbackPayload: MpesaCallbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: initiateRes.merchantRequestId,
            CheckoutRequestID: initiateRes.checkoutRequestId,
            ResultCode: 1032,
            ResultDesc: 'Request cancelled by user',
          },
        },
      };

      const result = await mpesaService.processCallback(callbackPayload);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Request cancelled by user');

      // Verify subscription remained STARTER
      const sub = await billingDal.getSubscription('usr_mpesa_fail');
      expect(sub.tier).toBe(SubscriptionTier.STARTER);

      // Verify invoice recorded as FAILED
      const invoices = await billingDal.getUserInvoices({ userId: 'usr_mpesa_fail' }, 'usr_mpesa_fail');
      expect(invoices).toHaveLength(1);
      expect(invoices[0]!.status).toBe('FAILED');
    });

    it('handles callback for unknown checkoutRequestId gracefully', async () => {
      const payload: MpesaCallbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'unknown_mr',
            CheckoutRequestID: 'unknown_co',
            ResultCode: 0,
            ResultDesc: 'Success',
          },
        },
      };

      const result = await mpesaService.processCallback(payload);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown transaction');
    });
  });

  describe('Stripe Checkout Service', () => {
    it('creates checkout session and handles checkout.session.completed webhook', async () => {
      const session = { userId: 'usr_stripe_test' };
      const checkout = await stripeService.createCheckoutSession(session, {
        tier: SubscriptionTier.HERITAGE,
        cycle: BillingCycle.ANNUAL,
        userId: session.userId,
        userEmail: 'stripe_user@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(checkout.sessionId).toContain('cs_test_');
      expect(checkout.checkoutUrl).toContain('checkout.stripe.com');

      // Simulate Stripe webhook
      const webhookRes = await stripeService.handleWebhook({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: checkout.sessionId,
            subscription: 'sub_stripe_mock_123',
            amount_total: 3999,
            currency: 'usd',
          },
        },
      });

      expect(webhookRes.success).toBe(true);
      expect(webhookRes.handled).toBe(true);

      const sub = await billingDal.getSubscription('usr_stripe_test');
      expect(sub.tier).toBe(SubscriptionTier.HERITAGE);
      expect(sub.gateway).toBe(PaymentGateway.STRIPE);
      expect(sub.externalSubscriptionId).toBe('sub_stripe_mock_123');
    });

    it('ignores unknown webhook events safely', async () => {
      const res = await stripeService.handleWebhook({
        type: 'payment_intent.created',
        data: { object: { id: 'pi_test_123' } },
      });
      expect(res.handled).toBe(false);
    });
  });

  describe('Tier Quota Enforcer', () => {
    const userId = 'usr_quota_test';

    it('enforces storage limits on Starter tier (1GB)', async () => {
      // 500MB current + 200MB new = 700MB -> within 1GB
      await expect(
        quotaEnforcer.assertStorageWithinQuota(userId, 500 * 1024 * 1024, 200 * 1024 * 1024)
      ).resolves.toBeUndefined();

      // 800MB current + 300MB new = 1.1GB -> exceeds 1GB
      await expect(
        quotaEnforcer.assertStorageWithinQuota(userId, 800 * 1024 * 1024, 300 * 1024 * 1024)
      ).rejects.toThrow(QuotaExceededError);
    });

    it('enforces trustee nomination limit on Starter tier (2 max)', async () => {
      await expect(quotaEnforcer.assertTrusteeWithinLimit(userId, 1)).resolves.toBeUndefined();
      await expect(quotaEnforcer.assertTrusteeWithinLimit(userId, 2)).rejects.toThrow(QuotaExceededError);
    });

    it('enforces beneficiary limit on Starter tier (3 max)', async () => {
      await expect(quotaEnforcer.assertBeneficiaryWithinLimit(userId, 2)).resolves.toBeUndefined();
      await expect(quotaEnforcer.assertBeneficiaryWithinLimit(userId, 3)).rejects.toThrow(QuotaExceededError);
    });

    it('enforces feature gating: blocks will builder on Starter, allows on Heritage', async () => {
      // On Starter: blocked
      await expect(
        quotaEnforcer.assertFeatureAllowed(userId, 'WILL_BUILDER')
      ).rejects.toThrow(FeatureNotAllowedError);

      // Upgrade to Heritage
      await billingDal.updateSubscription(
        { userId },
        SubscriptionTier.HERITAGE,
        BillingCycle.ANNUAL,
        PaymentGateway.MPESA
      );

      // On Heritage: allowed
      await expect(quotaEnforcer.assertFeatureAllowed(userId, 'WILL_BUILDER')).resolves.toBeUndefined();
      await expect(quotaEnforcer.assertFeatureAllowed(userId, 'MEDIA_MEMOS')).resolves.toBeUndefined();
    });
  });
});
